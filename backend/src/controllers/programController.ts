import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Program from '../models/Program';
import Counselor from '../models/Counselor';
import Student from '../models/Student';
import { USER_ROLE } from '../types/roles';
import User from '../models/User';
import * as XLSX from 'xlsx';

/**
 * Get all programs for a student (added by their assigned counselor)
 */
export const getStudentPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.STUDENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Get all programs made for this student by any counselor
    // Show all programs where studentId matches, regardless of which counselor created them
    const allPrograms = await Program.find({
      $or: [
        { studentId: student._id }, // Programs specifically for this student
        { studentId: null }, // General programs (not linked to any student)
        { studentId: { $exists: false } }, // Programs without studentId field
      ],
    })
      .populate({
        path: 'counselorId',
        select: 'email mobileNumber specializations userId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    // Separate available and applied programs
    const availablePrograms = allPrograms.filter(p => !p.isSelectedByStudent || p.studentId?.toString() !== student._id.toString());
    const appliedPrograms = allPrograms
      .filter(p => p.isSelectedByStudent && p.studentId?.toString() === student._id.toString())
      .sort((a, b) => {
        // Sort by priority first, then by selectedAt
        if (a.priority !== b.priority) {
          return (a.priority || 0) - (b.priority || 0);
        }
        return (a.selectedAt?.getTime() || 0) - (b.selectedAt?.getTime() || 0);
      });

    return res.status(200).json({
      success: true,
      message: 'Programs fetched successfully',
      data: {
        availablePrograms,
        appliedPrograms,
      },
    });
  } catch (error: any) {
    console.error('Get student programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: error.message,
    });
  }
};

/**
 * Get programs for a specific student (counselor view)
 */
export const getCounselorStudentPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.COUNSELOR) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const counselor = await Counselor.findOne({ userId });
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: 'Counselor record not found',
      });
    }

    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Get all programs for this student from ANY counselor (not just this counselor)
    // If section is "Applied Program", only return programs selected by the student
    // If section is "all" or not specified, only show programs NOT selected by student (for "Apply to Program")
    const { section } = req.query;
    
    // If requesting applied programs, only show selected ones
    if (section === 'applied') {
      const query = {
        studentId: studentId,
        isSelectedByStudent: true,
      };
      const programs = await Program.find(query)
        .populate({
          path: 'counselorId',
          select: 'email mobileNumber specializations userId',
          populate: {
            path: 'userId',
            select: 'name email'
          }
        })
        .sort({ priority: 1, selectedAt: 1 });
      
      return res.status(200).json({
        success: true,
        message: 'Programs fetched successfully',
        data: { programs },
      });
    } else {
      // For "Apply to Program", show only programs that are NOT selected
      // $ne: true will match false, null, and undefined (since default is false)
      const query = {
        studentId: studentId,
        isSelectedByStudent: { $ne: true },
      };
      const programs = await Program.find(query)
        .populate({
          path: 'counselorId',
          select: 'email mobileNumber specializations userId',
          populate: {
            path: 'userId',
            select: 'name email'
          }
        })
        .sort({ createdAt: -1 });
      
      return res.status(200).json({
        success: true,
        message: 'Programs fetched successfully',
        data: { programs },
      });
    }
  } catch (error: any) {
    console.error('Get counselor student programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: error.message,
    });
  }
};

/**
 * Get all programs for a counselor
 */
export const getCounselorPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.COUNSELOR) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const counselor = await Counselor.findOne({ userId });
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: 'Counselor record not found',
      });
    }

    const programs = await Program.find({ counselorId: counselor._id })
      .populate('studentId', 'userId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Programs fetched successfully',
      data: { programs },
    });
  } catch (error: any) {
    console.error('Get counselor programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: error.message,
    });
  }
};

/**
 * Create a new program (counselor)
 */
export const createProgram = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.COUNSELOR) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const counselor = await Counselor.findOne({ userId });
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: 'Counselor record not found',
      });
    }

    const {
      studentId, // Optional: if provided, link program to specific student
      university,
      universityRanking,
      programName,
      websiteUrl,
      campus,
      country,
      studyLevel,
      duration,
      ieltsScore,
      applicationFee,
      yearlyTuitionFees,
    } = req.body;

    // Validate required fields
    if (!university || !programName || !websiteUrl || !campus || !country || !studyLevel || !duration || !ieltsScore || !applicationFee || !yearlyTuitionFees) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // If studentId is provided, validate it exists
    let studentObjectId = undefined;
    if (studentId) {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }
      studentObjectId = student._id;
    }

    const program = await Program.create({
      counselorId: counselor._id,
      studentId: studentObjectId, // Link to specific student if provided
      university,
      universityRanking: universityRanking || {},
      programName,
      websiteUrl,
      campus,
      country,
      studyLevel,
      duration,
      ieltsScore,
      applicationFee,
      yearlyTuitionFees,
      isSelectedByStudent: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: { program },
    });
  } catch (error: any) {
    console.error('Create program error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create program',
      error: error.message,
    });
  }
};

/**
 * Student selects a program
 */
export const selectProgram = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.STUDENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const { programId, priority, intake, year } = req.body;

    if (!programId || priority === undefined || !intake || !year) {
      return res.status(400).json({
        success: false,
        message: 'Program ID, priority, intake, and year are required',
      });
    }

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    // Verify the program is made for this student (or is a general program)
    if (program.studentId && program.studentId.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This program is not available for you',
      });
    }

    program.studentId = student._id;
    program.priority = priority;
    program.intake = intake;
    program.year = year;
    program.selectedAt = new Date();
    program.isSelectedByStudent = true;
    await program.save();

    return res.status(200).json({
      success: true,
      message: 'Program selected successfully',
      data: { program },
    });
  } catch (error: any) {
    console.error('Select program error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to select program',
      error: error.message,
    });
  }
};

/**
 * Student removes a program from applied list
 */
export const removeProgram = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.STUDENT) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const { programId } = req.params;

    const program = await Program.findById(programId);
    if (!program || program.studentId?.toString() !== student._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or not selected by you',
      });
    }

    program.studentId = undefined;
    program.priority = undefined;
    program.intake = undefined;
    program.year = undefined;
    program.selectedAt = undefined;
    program.isSelectedByStudent = false;
    await program.save();

    return res.status(200).json({
      success: true,
      message: 'Program removed successfully',
    });
  } catch (error: any) {
    console.error('Remove program error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove program',
      error: error.message,
    });
  }
};

/**
 * Admin updates program priority, intake, and year
 */
export const updateProgramSelection = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { programId } = req.params;
    const { priority, intake, year } = req.body;

    if (priority === undefined || !intake || !year) {
      return res.status(400).json({
        success: false,
        message: 'Priority, intake, and year are required',
      });
    }

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    program.priority = priority;
    program.intake = intake;
    program.year = year;
    await program.save();

    return res.status(200).json({
      success: true,
      message: 'Program updated successfully',
      data: { program },
    });
  } catch (error: any) {
    console.error('Update program selection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update program',
      error: error.message,
    });
  }
};

/**
 * Get programs for a specific student (admin view) - only filter by studentId, not counselorId
 */
export const getAdminStudentPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Get all programs for this student (only filter by studentId, not counselorId)
    // If section is "Applied Program", only return programs selected by the student
    // If section is "all" or not specified, only show programs NOT selected by student (for "Apply to Program")
    const { section } = req.query;
    
    // If requesting applied programs, only show selected ones
    if (section === 'applied') {
      const query = {
        studentId: studentId,
        isSelectedByStudent: true,
      };
      const programs = await Program.find(query)
        .populate({
          path: 'counselorId',
          select: 'email mobileNumber specializations userId',
          populate: {
            path: 'userId',
            select: 'name email'
          }
        })
        .sort({ priority: 1, selectedAt: 1 });
      
      return res.status(200).json({
        success: true,
        message: 'Programs fetched successfully',
        data: { programs },
      });
    } else {
      // For "Apply to Program", show only programs that are NOT selected
      // $ne: true will match false, null, and undefined (since default is false)
      const query = {
        studentId: studentId,
        isSelectedByStudent: { $ne: true },
      };
      const programs = await Program.find(query)
        .populate({
          path: 'counselorId',
          select: 'email mobileNumber specializations userId',
          populate: {
            path: 'userId',
            select: 'name email'
          }
        })
        .sort({ createdAt: -1 });
      
      return res.status(200).json({
        success: true,
        message: 'Programs fetched successfully',
        data: { programs },
      });
    }
  } catch (error: any) {
    console.error('Get admin student programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: error.message,
    });
  }
};

/**
 * Get applied programs for a student (admin view) - kept for backward compatibility
 */
export const getStudentAppliedPrograms = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Get all programs selected by this student
    const programs = await Program.find({
      studentId: studentId,
      isSelectedByStudent: true,
    })
      .populate('counselorId', 'email mobileNumber specializations')
      .sort({ priority: 1, selectedAt: 1 });

    return res.status(200).json({
      success: true,
      message: 'Applied programs fetched successfully',
      data: { programs },
    });
  } catch (error: any) {
    console.error('Get student applied programs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch applied programs',
      error: error.message,
    });
  }
};

/**
 * Upload programs from Excel file
 */
export const uploadProgramsFromExcel = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (user?.role !== USER_ROLE.COUNSELOR) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const counselor = await Counselor.findOne({ userId });
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: 'Counselor record not found',
      });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Read Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const programs = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      try {
        // Map Excel columns to program fields
        // Expected columns: University, Program Name, Website URL, Campus, Country, Study Level, Duration, IELTS Score, Application Fee, Yearly Tuition Fees, Webometrics World, Webometrics National, US News, QS
        
        // Helper function to get value from row with multiple possible column names
        const getValue = (keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key];
            }
          }
          return '';
        };

        const getNumber = (keys: string[], defaultValue: number = 0) => {
          const value = getValue(keys);
          if (value === '' || value === undefined || value === null) return defaultValue;
          // Handle string numbers with commas, currency symbols, or other formatting
          let cleanValue = String(value).replace(/,/g, '').replace(/£/g, '').replace(/\$/g, '').trim();
          // Remove any non-numeric characters except decimal point
          cleanValue = cleanValue.replace(/[^\d.]/g, '');
          const num = parseFloat(cleanValue);
          return isNaN(num) ? defaultValue : num;
        };

        const getInt = (keys: string[]) => {
          const value = getValue(keys);
          if (value === '' || value === undefined || value === null) return undefined;
          const num = typeof value === 'number' ? value : parseInt(String(value));
          return isNaN(num) ? undefined : num;
        };
        
        // Get studentId from request body if provided
        const studentId = req.body.studentId;

        // Validate studentId if provided
        let studentObjectId = undefined;
        if (studentId) {
          const student = await Student.findById(studentId);
          if (!student) {
            errors.push({
              row: i + 2,
              error: 'Student not found',
            });
            continue;
          }
          studentObjectId = student._id;
        }

        const programData: any = {
          counselorId: counselor._id,
          studentId: studentObjectId, // Link to specific student if provided
          university: getValue(['University', 'university', 'UNIVERSITY']),
          programName: getValue(['Program Name', 'Program Name', 'programName', 'Program', 'program']),
          websiteUrl: getValue(['Website URL', 'Website Url', 'websiteUrl', 'Website', 'website', 'URL', 'url']),
          campus: getValue(['Campus', 'campus', 'CAMPUS']),
          country: getValue(['Country', 'country', 'COUNTRY']),
          studyLevel: getValue(['Study Level', 'Study Level', 'studyLevel', 'Level', 'level']) || 'Postgraduate',
          duration: getNumber(['Duration', 'duration', 'DURATION'], 12),
          ieltsScore: getNumber(['IELTS Score', 'IELTS Score', 'ieltsScore', 'IELTS', 'ielts'], 0),
          applicationFee: getNumber(['Application Fee', 'Application Fee', 'applicationFee', 'Fee', 'fee'], 0),
          yearlyTuitionFees: getNumber(['Yearly Tuition Fees', 'Yearly Tuition Fees', 'yearlyTuitionFees', 'Tuition', 'tuition'], 0),
          universityRanking: {
            webometricsWorld: getInt(['Webometrics World', 'Webometrics World', 'webometricsWorld', 'Webometrics World Ranking']),
            webometricsNational: getInt(['Webometrics National', 'Webometrics National', 'webometricsNational', 'Webometrics National Ranking']),
            usNews: getInt(['US News', 'US News', 'usNews', 'US News Ranking']),
            qs: getInt(['QS', 'QS', 'qs', 'QS Ranking']),
          },
          isSelectedByStudent: false,
        };

        // Validate required fields
        if (!programData.university || !programData.programName || !programData.websiteUrl || 
            !programData.campus || !programData.country || !programData.studyLevel) {
          errors.push({
            row: i + 2, // +2 because Excel rows start at 1 and we have header
            error: 'Missing required fields',
          });
          continue;
        }

        const program = await Program.create(programData);
        programs.push(program);
      } catch (error: any) {
        errors.push({
          row: i + 2,
          error: error.message || 'Failed to create program',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${programs.length} programs${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      data: {
        imported: programs.length,
        errors: errors.length,
        errorDetails: errors,
      },
    });
  } catch (error: any) {
    console.error('Upload programs from Excel error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload programs from Excel',
      error: error.message,
    });
  }
};

