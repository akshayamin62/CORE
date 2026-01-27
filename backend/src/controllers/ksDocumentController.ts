import { Response } from "express";
import { AuthRequest } from "../types/auth";
import KSDocumentField from "../models/KSDocumentField";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import mongoose from "mongoose";

// Get KS document fields for a specific student
export const getKSDocumentFields = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId } = req.params;

    // Verify registration exists
    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Get KS document fields for this student
    const fields = await KSDocumentField.find({
      studentId: registration.studentId,
      registrationId,
      isActive: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      data: { fields },
    });
  } catch (error: any) {
    console.error("Get KS document fields error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch KS document fields",
    });
  }
};

// Add new KS document field for a specific student (Admin/OPS only)
export const addKSDocumentField = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId, documentName, category, required, helpText, allowMultiple } = req.body;

    if (!registrationId || !documentName) {
      return res.status(400).json({
        success: false,
        message: "Registration ID and document name are required",
      });
    }

    // Verify registration exists
    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Generate document key from name
    const documentKey = `ks_${documentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")}_${Date.now()}`;

    // Get max order for this student's KS documents
    const maxOrderField = await KSDocumentField.findOne({
      studentId: registration.studentId,
      registrationId,
    }).sort({ order: -1 });

    const nextOrder = maxOrderField ? maxOrderField.order + 1 : 1;

    // Create new KS document field
    const newField = await KSDocumentField.create({
      studentId: registration.studentId,
      registrationId,
      documentName,
      documentKey,
      category: category || "SECONDARY",
      required: required || false,
      helpText: helpText || undefined,
      allowMultiple: allowMultiple || false,
      order: nextOrder,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      createdByRole: req.user!.role as "ADMIN" | "OPS",
    });

    return res.status(201).json({
      success: true,
      message: "KS document field created successfully",
      data: { field: newField },
    });
  } catch (error: any) {
    console.error("Add KS document field error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add KS document field",
    });
  }
};

// Delete KS document field (Admin/OPS only)
export const deleteKSDocumentField = async (req: AuthRequest, res: Response) => {
  try {
    const { fieldId } = req.params;

    const field = await KSDocumentField.findById(fieldId);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: "KS document field not found",
      });
    }

    // Soft delete by setting isActive to false
    field.isActive = false;
    await field.save();

    return res.status(200).json({
      success: true,
      message: "KS document field deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete KS document field error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete KS document field",
    });
  }
};

