import mongoose from "mongoose";
import dotenv from "dotenv";
import FormPart, { FormPartKey } from "./models/FormPart";
import FormSection from "./models/FormSection";
import FormSubSection from "./models/FormSubSection";
import FormField, { FieldType } from "./models/FormField";

dotenv.config();

const seedDocumentFields = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find the DOCUMENT part
    const documentPart = await FormPart.findOne({ key: FormPartKey.DOCUMENT });
    if (!documentPart) {
      console.error("❌ DOCUMENT part not found. Please run main seed first.");
      process.exit(1);
    }

    console.log("🗑️  Clearing existing document sections and fields...");
    
    // Find all sections for DOCUMENT part
    const documentSections = await FormSection.find({ partId: documentPart._id });
    const sectionIds = documentSections.map(s => s._id);
    
    // Find all subsections for these sections
    const documentSubSections = await FormSubSection.find({ sectionId: { $in: sectionIds } });
    const subSectionIds = documentSubSections.map(ss => ss._id);
    
    // Delete fields, subsections, and sections
    await FormField.deleteMany({ subSectionId: { $in: subSectionIds } });
    await FormSubSection.deleteMany({ sectionId: { $in: sectionIds } });
    await FormSection.deleteMany({ partId: documentPart._id });

    console.log("📄 Creating DOCUMENT sections...");
    const documentSections2 = await FormSection.insertMany([
      {
        partId: documentPart._id,
        title: "Your Documents",
        description: "Upload your documents",
        order: 1,
        isActive: true,
      },
      {
        partId: documentPart._id,
        title: "KS Documents",
        description: "Documents from Kareer Studio",
        order: 2,
        isActive: true,
      },
    ]);

    console.log("📂 Creating document subsections...");
    const yourDocsSubSections = await FormSubSection.insertMany([
      {
        sectionId: documentSections2[0]._id,
        title: "Primary Documents",
        order: 1,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: documentSections2[0]._id,
        title: "Secondary Documents",
        order: 2,
        isRepeatable: false,
        isActive: true,
      },
    ]);

    console.log("📝 Creating document fields...");
    await FormField.insertMany([
      // Primary Documents
      {
        subSectionId: yourDocsSubSections[0]._id,
        label: "Passport (First and last Page)",
        key: "passport_first_last_page",
        type: FieldType.FILE,
        required: true,
        order: 1,
        isActive: true,
        helpText: "Upload first and last page of your passport",
      },
      {
        subSectionId: yourDocsSubSections[0]._id,
        label: "SSC Marksheet",
        key: "ssc_marksheet",
        type: FieldType.FILE,
        required: true,
        order: 2,
        isActive: true,
        helpText: "Upload your SSC/10th grade marksheet",
      },
      {
        subSectionId: yourDocsSubSections[0]._id,
        label: "HSC/Diploma Marksheet",
        key: "hsc_diploma_marksheet",
        type: FieldType.FILE,
        required: true,
        order: 3,
        isActive: true,
        helpText: "Upload your HSC/12th grade or Diploma marksheet",
      },
      {
        subSectionId: yourDocsSubSections[0]._id,
        label: "Passport size Photograph",
        key: "passport_photograph",
        type: FieldType.FILE,
        required: true,
        order: 4,
        isActive: true,
        helpText: "Upload a recent passport size photograph",
      },
      // Secondary Documents
      {
        subSectionId: yourDocsSubSections[1]._id,
        label: "Work Experience letter/Offer Letter",
        key: "work_experience_letter",
        type: FieldType.FILE,
        required: false,
        order: 1,
        isActive: true,
        helpText: "Upload work experience letter or offer letter",
      },
      {
        subSectionId: yourDocsSubSections[1]._id,
        label: "Certificate of any workshop/Seminar attended",
        key: "workshop_seminar_certificate",
        type: FieldType.FILE,
        required: false,
        order: 2,
        isActive: true,
        helpText: "Upload certificates of workshops or seminars attended",
      },
      {
        subSectionId: yourDocsSubSections[1]._id,
        label: "Certificate of any social contribution made",
        key: "social_contribution_certificate",
        type: FieldType.FILE,
        required: false,
        order: 3,
        isActive: true,
        helpText: "Upload certificates of social contributions or volunteer work",
      },
    ]);

    console.log("✅ Document fields seeded successfully!");
    console.log("   - 2 sections created (Your Documents, KS Documents)");
    console.log("   - 2 subsections created (Primary, Secondary)");
    console.log("   - 4 primary document fields created");
    console.log("   - 3 secondary document fields created");

    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error seeding document fields:", error);
    process.exit(1);
  }
};

seedDocumentFields();
