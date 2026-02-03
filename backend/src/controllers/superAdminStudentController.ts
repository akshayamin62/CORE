import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import User from '../models/User';
import Ops from '../models/Ops';
// import Admin from '../models/Admin';
// import Counselor from '../models/Counselor';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import StudentFormAnswer from '../models/StudentFormAnswer';
import { USER_ROLE } from '../types/roles';

/**
 * Get all students with their registrations
 * For ops: only show students assigned to them
 * For admins: show all students
 */
export const getAllStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    const userRole = user?.role;
    
    let studentQuery: any = {};
    
    // If user is an ops, filter by active assignments only
    if (userRole === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId });
      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'Ops record not found',
        });
      }
      
      // Get all registrations where this ops is ACTIVE
      // Note: Only active ops can see students
      // Fallback to primaryOpsId if activeOpsId is not set (for backward compatibility)
      const registrations = await StudentServiceRegistration.find({
        $or: [
          { activeOpsId: ops._id },
          { activeOpsId: { $exists: false }, primaryOpsId: ops._id },
          { activeOpsId: null, primaryOpsId: ops._id }
        ]
      }).select('studentId');
      
      const studentIds = [...new Set(registrations.map(r => r.studentId.toString()))];
      
      if (studentIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Students fetched successfully',
          data: {
            students: [],
            total: 0,
          },
        });
      }
      
      studentQuery = { _id: { $in: studentIds } };
    }
    
    const students = await Student.find(studentQuery)
      .populate('userId', 'name email isVerified isActive createdAt')
      .populate({
        path: 'adminId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate({
        path: 'counselorId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    // Get registration count for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const registrationCount = await StudentServiceRegistration.countDocuments({
          studentId: student._id,
        });

        return {
          _id: student._id,
          user: student.userId,
          mobileNumber: student.mobileNumber,
          adminId: student.adminId,
          counselorId: student.counselorId,
          registrationCount,
          createdAt: student.createdAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data: {
        students: studentsWithStats,
        total: studentsWithStats.length,
      },
    });
  } catch (error: any) {
    console.error('Get all students error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message,
    });
  }
};

/**
 * Get student details with all registrations
 * For ops: only show details if they are active OPS for at least one registration
 */
export const getStudentDetails = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    const student = await Student.findById(studentId)
      .populate('userId', 'name email role isVerified isActive createdAt')
      .populate({
        path: 'adminId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate({
        path: 'counselorId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .lean()
      .exec();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const registrations = await StudentServiceRegistration.find({
      studentId: student._id,
    })
      .populate('serviceId', 'name slug shortDescription icon')
      .populate('primaryOpsId', 'userId email specializations')
      .populate('secondaryOpsId', 'userId email specializations')
      .populate('activeOpsId', 'userId email specializations')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // If user is OPS, verify they are active OPS for at least one registration
    if (user?.role === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId });

      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'OPS record not found',
        });
      }

      const hasAccess = registrations.some(reg => {
        // Handle both populated (document) and unpopulated (ObjectId) OPS references
        const activeOpsIdValue = reg.activeOpsId || reg.primaryOpsId;
        const activeOpsIdString = activeOpsIdValue?._id?.toString() || activeOpsIdValue?.toString();
        return activeOpsIdString === ops._id.toString();
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active OPS for this student.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Student details fetched successfully',
      data: {
        student,
        registrations,
      },
    });
  } catch (error: any) {
    console.error('Get student details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student details',
      error: error.message,
    });
  }
};

/**
 * Get student form answers for a specific registration
 * For ops: only allow access if they are the active OPS
 */
export const getStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, registrationId } = req.params;
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    const registration = await StudentServiceRegistration.findOne({
      _id: registrationId,
      studentId,
    })
      .populate('serviceId', 'name')
      .populate('activeOpsId')
      .lean()
      .exec();

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // If user is OPS, verify they are the active OPS for this registration
    if (user?.role === USER_ROLE.OPS) {
      const ops = await Ops.findOne({ userId }).lean().exec();
      if (!ops) {
        return res.status(404).json({
          success: false,
          message: 'OPS record not found',
        });
      }

      // Get the full registration with populated fields to check access
      const fullRegistration = await StudentServiceRegistration.findById(registrationId)
        .populate('primaryOpsId')
        .populate('activeOpsId')
        .lean()
        .exec();
      
      // Handle both populated (document) and unpopulated (ObjectId) OPS references
      const activeOpsIdValue = fullRegistration?.activeOpsId || fullRegistration?.primaryOpsId;
      const activeOpsIdString = activeOpsIdValue?._id?.toString() || activeOpsIdValue?.toString();
      
      if (activeOpsIdString !== ops._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active OPS for this registration.',
        });
      }
    }

    // Get all form answers for this student (optimized with lean)
    const answers = await StudentFormAnswer.find({
      studentId,
    })
      .sort({ lastSavedAt: -1 })
      .lean()
      .exec();

    // Get student record to include mobileNumber (optimized with lean)
    const student = await Student.findById(studentId).lean().exec();

    return res.status(200).json({
      success: true,
      message: 'Form answers fetched successfully',
      data: {
        registration,
        answers,
        student: student ? {
          mobileNumber: student.mobileNumber,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get student form answers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch form answers',
      error: error.message,
    });
  }
};

/**
 * Update student form answers (admin/OPS can edit)
 */
export const updateStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, partKey } = req.params;
    const { answers } = req.body;

    // Find or create the answer document
    let answerDoc = await StudentFormAnswer.findOne({
      studentId,
      partKey,
    });

    if (answerDoc) {
      answerDoc.answers = { ...answerDoc.answers, ...answers };
      answerDoc.lastSavedAt = new Date();
      await answerDoc.save();
    } else {
      answerDoc = await StudentFormAnswer.create({
        studentId,
        partKey,
        answers,
        lastSavedAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Form answers updated successfully',
      data: { answerDoc },
    });
  } catch (error: any) {
    console.error('Update student form answers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update form answers',
      error: error.message,
    });
  }
};

/**
 * Get all students with service registrations (for dropdown/selection)
 */
export const getStudentsWithRegistrations = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { serviceId } = req.query;

    let query: any = {};
    if (serviceId) {
      // Get students registered for a specific service
      const registrations = await StudentServiceRegistration.find({ serviceId }).select('studentId');
      const studentIds = registrations.map((r) => r.studentId);
      query = { _id: { $in: studentIds } };
    }

    const students = await Student.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data: { students },
    });
  } catch (error: any) {
    console.error('Get students with registrations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message,
    });
  }
};

/**
 * Assign primary and secondary ops to a student service registration
 */
export const assignOps = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const { primaryOpsId, secondaryOpsId } = req.body;

    if (!primaryOpsId && !secondaryOpsId) {
      return res.status(400).json({
        success: false,
        message: 'At least one OPS ID is required',
      });
    }

    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // Verify primary OPS exists
    if (primaryOpsId) {
      const primaryOps = await Ops.findById(primaryOpsId);
      if (!primaryOps) {
        return res.status(404).json({
          success: false,
          message: 'Primary OPS not found',
        });
      }
      registration.primaryOpsId = primaryOpsId;
      
      // Set as active if no active OPS or if updating primary
      if (!registration.activeOpsId) {
        registration.activeOpsId = primaryOpsId;
      }
    }

    // Verify secondary OPS exists
    if (secondaryOpsId) {
      const secondaryOps = await Ops.findById(secondaryOpsId);
      if (!secondaryOps) {
        return res.status(404).json({
          success: false,
          message: 'Secondary OPS not found',
        });
      }
      registration.secondaryOpsId = secondaryOpsId;
    }

    await registration.save();

    const updatedRegistration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name slug shortDescription icon')
      .populate('primaryOpsId')
      .populate('secondaryOpsId')
      .populate('activeOpsId');

    return res.status(200).json({
      success: true,
      message: 'Ops assigned successfully',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error: any) {
    console.error('Assign ops error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign ops',
      error: error.message,
    });
  }
};

/**
 * Switch active OPS between primary and secondary
 */
export const switchActiveOps = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const { activeOpsId } = req.body;

    if (!activeOpsId) {
      return res.status(400).json({
        success: false,
        message: 'Active OPS ID is required',
      });
    }

    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // Verify the OPS is either primary or secondary
    const isPrimary = registration.primaryOpsId?.toString() === activeOpsId;
    const isSecondary = registration.secondaryOpsId?.toString() === activeOpsId;

    if (!isPrimary && !isSecondary) {
      return res.status(400).json({
        success: false,
        message: 'Selected OPS must be either primary or secondary OPS',
      });
    }

    registration.activeOpsId = activeOpsId;
    await registration.save();

    const updatedRegistration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name slug shortDescription icon')
      .populate('primaryOpsId')
      .populate('secondaryOpsId')
      .populate('activeOpsId');

    return res.status(200).json({
      success: true,
      message: 'Active OPS switched successfully',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error: any) {
    console.error('Switch active OPS error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to switch active OPS',
      error: error.message,
    });
  }
};


