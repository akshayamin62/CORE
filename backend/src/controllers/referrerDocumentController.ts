import { Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { AuthRequest } from "../types/auth";
import Referrer, { IReferrer } from "../models/Referrer";
import ReferrerDocument, { ReferrerDocumentStatus } from "../models/ReferrerDocument";
import ReferrerDocumentField from "../models/ReferrerDocumentField";
import User from "../models/User";
import { USER_ROLE } from "../types/roles";
import { getUploadBaseDir, ensureDir, validateFilePath } from "../utils/uploadDir";
import { sendEmail } from "../utils/email";

const DEFAULT_DOCUMENT_FIELDS = [
  {
    documentName: "PAN Copy",
    documentKey: "pan_card",
    section: "Identity Documents",
    helpText: "Upload a clear copy of your PAN card",
    required: true,
    order: 1,
  },
  {
    documentName: "Aadhaar Copy",
    documentKey: "aadhar_card",
    section: "Identity Documents",
    helpText: "Upload a clear copy of your Aadhaar card",
    required: true,
    order: 2,
  },
  {
    documentName: "Cancelled Cheque / Bank Proof",
    documentKey: "cancelled_cheque",
    section: "Identity Documents",
    helpText: "Upload cancelled cheque or bank account proof",
    required: true,
    order: 3,
  },
  {
    documentName: "Passport-size Photograph",
    documentKey: "passport_photo",
    section: "Identity Documents",
    helpText: "Upload a recent passport-size photograph",
    required: true,
    order: 4,
  },
  {
    documentName: "GST Certificate (if applicable)",
    documentKey: "gst_certificate",
    section: "Identity Documents",
    helpText: "Upload GST registration certificate if applicable",
    required: false,
    order: 5,
  },
  {
    documentName: "Signed Code of Conduct",
    documentKey: "signed_code_of_conduct",
    section: "Identity Documents",
    helpText: "Upload the signed code of conduct document",
    required: true,
    order: 6,
  },
  {
    documentName: "Signed Confidentiality Undertaking",
    documentKey: "signed_confidentiality",
    section: "Identity Documents",
    helpText: "Upload the signed confidentiality undertaking",
    required: true,
    order: 7,
  },
];

const getReferrerForUser = async (userId: string) => {
  return Referrer.findOne({ userId });
};

const assertAdminOwnsReferrer = async (referrerId: string, adminUserId: string) => {
  return Referrer.findOne({ _id: referrerId, adminId: adminUserId });
};

const ensureReferrerDocumentFields = async (
  referrerId: mongoose.Types.ObjectId,
  createdByUserId: string,
  createdByRole: string
) => {
  const existingKeys = await ReferrerDocumentField.find({
    referrerId,
    isActive: true,
  }).distinct("documentKey");
  const existingKeySet = new Set(existingKeys);

  const toCreate = DEFAULT_DOCUMENT_FIELDS.filter((f) => !existingKeySet.has(f.documentKey));

  if (toCreate.length > 0) {
    await ReferrerDocumentField.insertMany(
      toCreate.map((f) => ({
        referrerId,
        documentName: f.documentName,
        documentKey: f.documentKey,
        section: f.section,
        required: f.required,
        helpText: f.helpText,
        order: f.order,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(createdByUserId),
        createdByRole: createdByRole === USER_ROLE.SUPER_ADMIN || createdByRole === USER_ROLE.ADMIN
          ? createdByRole
          : ("SYSTEM" as const),
      }))
    );
  }
};

const saveReferrerDocumentFile = async (params: {
  referrerId: mongoose.Types.ObjectId;
  documentKey: string;
  documentName?: string;
  documentFieldId?: string;
  file: Express.Multer.File;
  userId: string;
  userRole: string;
  autoApprove?: boolean;
}) => {
  const { referrerId, documentKey, documentName, documentFieldId, file, userId, userRole, autoApprove } =
    params;

  const storeDir = path.join(
    getUploadBaseDir(),
    `referrer-documents/referrer-${referrerId.toString()}`
  );
  const filePathPrefix = `uploads/referrer-documents/referrer-${referrerId.toString()}`;
  ensureDir(storeDir);

  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
  const finalFilename = `${documentKey}_${timestamp}_${sanitizedName}${ext}`;
  const finalPath = path.join(storeDir, finalFilename);

  fs.renameSync(file.path, finalPath);

  const existingDoc = await ReferrerDocument.findOne({
    referrerId,
    documentKey,
  });

  const now = new Date();
  const approved = !!autoApprove;

  if (existingDoc) {
    const oldFilePath = path.join(process.cwd(), existingDoc.filePath);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    existingDoc.fileName = finalFilename;
    existingDoc.filePath = `${filePathPrefix}/${finalFilename}`;
    existingDoc.fileSize = file.size;
    existingDoc.mimeType = file.mimetype;
    existingDoc.uploadedAt = now;
    existingDoc.uploadedBy = new mongoose.Types.ObjectId(userId);
    existingDoc.uploadedByRole = userRole;
    existingDoc.status = approved ? ReferrerDocumentStatus.APPROVED : ReferrerDocumentStatus.PENDING;
    existingDoc.version += 1;
    if (approved) {
      existingDoc.approvedBy = new mongoose.Types.ObjectId(userId);
      existingDoc.approvedAt = now;
      existingDoc.rejectionMessage = undefined;
      existingDoc.rejectedBy = undefined;
      existingDoc.rejectedAt = undefined;
    } else {
      existingDoc.approvedBy = undefined;
      existingDoc.approvedAt = undefined;
      existingDoc.rejectionMessage = undefined;
      existingDoc.rejectedBy = undefined;
      existingDoc.rejectedAt = undefined;
    }

    return existingDoc.save();
  }

  return ReferrerDocument.create({
    referrerId,
    documentFieldId:
      documentFieldId && mongoose.Types.ObjectId.isValid(documentFieldId)
        ? new mongoose.Types.ObjectId(documentFieldId)
        : undefined,
    documentName,
    documentKey,
    fileName: finalFilename,
    filePath: `${filePathPrefix}/${finalFilename}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedBy: new mongoose.Types.ObjectId(userId),
    uploadedByRole: userRole,
    status: approved ? ReferrerDocumentStatus.APPROVED : ReferrerDocumentStatus.PENDING,
    approvedBy: approved ? new mongoose.Types.ObjectId(userId) : undefined,
    approvedAt: approved ? now : undefined,
    version: 1,
  });
};

const isReferrerUploadLocked = async (userId: string): Promise<boolean> => {
  const user = await User.findById(userId).select("isVerified");
  return !!user?.isVerified;
};

// POST /seed-defaults
export const seedReferrerDefaultDocumentFields = async (req: AuthRequest, res: Response) => {
  try {
    const referrer = await getReferrerForUser(req.user!.userId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    await ensureReferrerDocumentFields(
      referrer._id as mongoose.Types.ObjectId,
      req.user!.userId,
      req.user!.role
    );

    const fields = await ReferrerDocumentField.find({
      referrerId: referrer._id,
      isActive: true,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ success: true, data: { fields } });
  } catch (error) {
    console.error("Seed referrer document fields error:", error);
    return res.status(500).json({ success: false, message: "Failed to seed document fields" });
  }
};

// GET /my-fields
export const getMyReferrerDocumentFields = async (req: AuthRequest, res: Response) => {
  try {
    const referrer = await getReferrerForUser(req.user!.userId);
    if (!referrer) {
      return res.status(200).json({ success: true, data: { fields: [] } });
    }

    const fields = await ReferrerDocumentField.find({
      referrerId: referrer._id,
      isActive: true,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ success: true, data: { fields } });
  } catch (error) {
    console.error("Get my referrer document fields error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch document fields" });
  }
};

// GET /my-documents
export const getMyReferrerDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const referrer = await getReferrerForUser(req.user!.userId);
    if (!referrer) {
      return res.status(200).json({ success: true, data: { documents: [] } });
    }

    const documents = await ReferrerDocument.find({ referrerId: referrer._id })
      .populate("documentFieldId", "documentName documentKey required helpText section")
      .sort({ createdAt: 1 });

    return res.status(200).json({ success: true, data: { documents } });
  } catch (error) {
    console.error("Get my referrer documents error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
};

// GET /fields/by-referrer/:referrerId
export const getReferrerDocumentFieldsByReferrerId = async (req: AuthRequest, res: Response) => {
  try {
    const { referrerId } = req.params;
    let referrer: IReferrer | null = null;

    if (req.user?.role === USER_ROLE.ADMIN) {
      referrer = await assertAdminOwnsReferrer(referrerId, req.user.userId);
      if (!referrer) {
        return res.status(404).json({ success: false, message: "Referrer not found or unauthorized" });
      }
    } else {
      referrer = await Referrer.findById(referrerId);
      if (!referrer) {
        return res.status(404).json({ success: false, message: "Referrer not found" });
      }
    }

    await ensureReferrerDocumentFields(
      referrer._id as mongoose.Types.ObjectId,
      req.user!.userId,
      req.user!.role
    );

    const fields = await ReferrerDocumentField.find({
      referrerId: referrer._id,
      isActive: true,
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({ success: true, data: { fields } });
  } catch (error) {
    console.error("Get referrer document fields by referrerId error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch document fields" });
  }
};

// GET /by-referrer/:referrerId
export const getReferrerDocumentsByReferrerId = async (req: AuthRequest, res: Response) => {
  try {
    const { referrerId } = req.params;

    if (req.user?.role === USER_ROLE.ADMIN) {
      const referrer = await assertAdminOwnsReferrer(referrerId, req.user.userId);
      if (!referrer) {
        return res.status(404).json({ success: false, message: "Referrer not found or unauthorized" });
      }
    } else {
      const referrer = await Referrer.findById(referrerId);
      if (!referrer) {
        return res.status(404).json({ success: false, message: "Referrer not found" });
      }
    }

    const documents = await ReferrerDocument.find({
      referrerId: new mongoose.Types.ObjectId(referrerId),
    })
      .populate("uploadedBy", "firstName middleName lastName email")
      .populate("approvedBy", "firstName middleName lastName email")
      .populate("rejectedBy", "firstName middleName lastName email")
      .populate("documentFieldId", "documentName documentKey required helpText section")
      .sort({ createdAt: 1 });

    return res.status(200).json({ success: true, data: { documents } });
  } catch (error) {
    console.error("Get referrer documents by referrerId error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
};

// POST /upload
export const uploadReferrerDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentKey, documentName, documentFieldId } = req.body;
    const file = req.file;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (!documentKey) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: "documentKey is required" });
    }

    const referrer = await getReferrerForUser(userId);
    if (!referrer) {
      fs.unlinkSync(file.path);
      return res.status(403).json({ success: false, message: "Referrer profile not found" });
    }

    const locked = await isReferrerUploadLocked(userId);
    if (locked) {
      const existingLockedDoc = await ReferrerDocument.findOne({
        referrerId: referrer._id,
        documentKey,
      });
      if (existingLockedDoc && existingLockedDoc.status !== ReferrerDocumentStatus.REJECTED) {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: "This document is already uploaded and cannot be replaced",
        });
      }
    }

    const document = await saveReferrerDocumentFile({
      referrerId: referrer._id as mongoose.Types.ObjectId,
      documentKey,
      documentName,
      documentFieldId,
      file,
      userId,
      userRole,
      autoApprove: false,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: { document },
    });
  } catch (error) {
    console.error("Upload referrer document error:", error);
    return res.status(500).json({ success: false, message: "Failed to upload document" });
  }
};

// POST /upload/by-referrer/:referrerId — Admin / super-admin upload (auto-approved)
export const uploadReferrerDocumentByReferrerId = async (req: AuthRequest, res: Response) => {
  try {
    const { referrerId } = req.params;
    const { documentKey, documentName, documentFieldId } = req.body;
    const file = req.file;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (!documentKey) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: "documentKey is required" });
    }

    let referrer: IReferrer | null = null;

    if (userRole === USER_ROLE.ADMIN) {
      referrer = await assertAdminOwnsReferrer(referrerId, userId);
      if (!referrer) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ success: false, message: "Referrer not found or unauthorized" });
      }
    } else if (userRole === USER_ROLE.SUPER_ADMIN) {
      referrer = await Referrer.findById(referrerId);
      if (!referrer) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ success: false, message: "Referrer not found" });
      }
    } else {
      fs.unlinkSync(file.path);
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await ensureReferrerDocumentFields(
      referrer._id as mongoose.Types.ObjectId,
      userId,
      userRole
    );

    const document = await saveReferrerDocumentFile({
      referrerId: referrer._id as mongoose.Types.ObjectId,
      documentKey,
      documentName,
      documentFieldId,
      file,
      userId,
      userRole,
      autoApprove: true,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded and approved successfully",
      data: { document },
    });
  } catch (error) {
    console.error("Upload referrer document by referrerId error:", error);
    return res.status(500).json({ success: false, message: "Failed to upload document" });
  }
};
export const viewReferrerDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    const document = await ReferrerDocument.findById(documentId);
    if (!document) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    if (userRole === USER_ROLE.REFERRER) {
      const referrer = await getReferrerForUser(userId);
      if (!referrer || document.referrerId.toString() !== referrer._id.toString()) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
    } else if (userRole === USER_ROLE.ADMIN) {
      const referrer = await assertAdminOwnsReferrer(document.referrerId.toString(), userId);
      if (!referrer) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
    }

    const filePath = path.join(process.cwd(), document.filePath);
    const safePath = validateFilePath(filePath);
    if (!safePath) {
      res.status(403).json({ success: false, message: "Access denied: invalid file path" });
      return;
    }
    if (!fs.existsSync(safePath)) {
      res.status(404).json({ success: false, message: "File not found on server" });
      return;
    }

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${document.fileName}"`);

    const fileStream = fs.createReadStream(safePath);
    fileStream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Failed to read file" });
      }
    });
    fileStream.pipe(res);
  } catch (error) {
    console.error("View referrer document error:", error);
    res.status(500).json({ success: false, message: "Failed to view document" });
  }
};

// PUT /:documentId/approve
export const approveReferrerDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await ReferrerDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (req.user!.role === USER_ROLE.ADMIN) {
      const referrer = await assertAdminOwnsReferrer(
        document.referrerId.toString(),
        req.user!.userId
      );
      if (!referrer) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    document.status = ReferrerDocumentStatus.APPROVED;
    document.approvedBy = new mongoose.Types.ObjectId(req.user!.userId);
    document.approvedAt = new Date();
    document.rejectionMessage = undefined;
    document.rejectedBy = undefined;
    document.rejectedAt = undefined;

    await document.save();

    return res.status(200).json({
      success: true,
      message: "Document approved successfully",
      data: { document },
    });
  } catch (error) {
    console.error("Approve referrer document error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve document" });
  }
};

// PUT /:documentId/reject
export const rejectReferrerDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { rejectionMessage } = req.body;

    if (!rejectionMessage || rejectionMessage.trim() === "") {
      return res.status(400).json({ success: false, message: "Rejection message is required" });
    }

    const document = await ReferrerDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (req.user!.role === USER_ROLE.ADMIN) {
      const referrer = await assertAdminOwnsReferrer(
        document.referrerId.toString(),
        req.user!.userId
      );
      if (!referrer) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    document.status = ReferrerDocumentStatus.REJECTED;
    document.rejectedBy = new mongoose.Types.ObjectId(req.user!.userId);
    document.rejectedAt = new Date();
    document.rejectionMessage = rejectionMessage.trim();
    document.approvedBy = undefined;
    document.approvedAt = undefined;

    await document.save();

    try {
      const referrer = await Referrer.findById(document.referrerId).select("userId email");
      const recipientUser = referrer?.userId
        ? await User.findById(referrer.userId).select("email firstName lastName")
        : null;
      const email = recipientUser?.email || referrer?.email;

      if (email) {
        await sendEmail({
          to: email,
          subject: "Document Rejected – Action Required",
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <h2 style="color:#dc2626">Document Rejected</h2>
              <p>Hi ${recipientUser?.firstName || ""} ${recipientUser?.lastName || ""},</p>
              <p>Your document <strong>${document.documentName}</strong> has been rejected.</p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:0;font-weight:600;color:#dc2626">Reason:</p>
                <p style="margin:8px 0 0;color:#7f1d1d">${rejectionMessage.trim()}</p>
              </div>
              <p>Please re-upload the document with the required corrections.</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Failed to send referrer document rejection email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "Document rejected",
      data: { document },
    });
  } catch (error) {
    console.error("Reject referrer document error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject document" });
  }
};
