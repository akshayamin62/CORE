import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import User from '../models/User';
import Counselor from '../models/Counselor';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import StudentFormAnswer from '../models/StudentFormAnswer';
import { USER_ROLE } from '../types/roles';

/**
 * Get all students with their registrations
 * For counselors: only show students assigned to them
 * For admins: show all students
 */
export const getAllStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    let studentQuery: any = {};
    
    // If user is a counselor, filter by active assignments only
    if (user?.role === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: 'Counselor record not found',
        });
      }
      
      // Get all registrations where this counselor is ACTIVE
      // Note: Only active counselors can see students
      // Fallback to primaryCounselorId if activeCounselorId is not set (for backward compatibility)
      const registrations = await StudentServiceRegistration.find({
        $or: [
          { activeCounselorId: counselor._id },
          { activeCounselorId: { $exists: false }, primaryCounselorId: counselor._id },
          { activeCounselorId: null, primaryCounselorId: counselor._id }
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
 * For counselors: only show details if they are active counselor for at least one registration
 */
export const getStudentDetails = async (req: AuthRequest, res: Response): Promise<Response> => {
  // ⏱️ Start total server timer
  const serverStartTime = performance.now();
  const requestId = Math.random().toString(36).substring(7);
  const timings: any = {};

  try {
    const { studentId } = req.params;
    console.log(`🔵 [${requestId}] Request started for student: ${studentId}`);
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    // ⏱️ Timer 1: Fetch student from MongoDB
    const studentQueryStart = performance.now();
    const student = await Student.findById(studentId).populate(
      'userId',
      'name email role isVerified isActive createdAt'
    );
    const studentQueryEnd = performance.now();
    timings.studentQuery = `${(studentQueryEnd - studentQueryStart).toFixed(2)}ms`;

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // ⏱️ Timer 2: Fetch registrations from MongoDB
    const registrationsQueryStart = performance.now();
    const registrations = await StudentServiceRegistration.find({
      studentId: student._id,
    })
      .populate('serviceId', 'name slug shortDescription icon')
      .populate('primaryCounselorId')
      .populate('secondaryCounselorId')
      .populate('activeCounselorId')
      .sort({ createdAt: -1 });
    const registrationsQueryEnd = performance.now();
    timings.registrationsQuery = `${(registrationsQueryEnd - registrationsQueryStart).toFixed(2)}ms`;

    // If user is counselor, verify they are active counselor for at least one registration
    if (user?.role === USER_ROLE.COUNSELOR) {
      const counselorQueryStart = performance.now();
      const counselor = await Counselor.findOne({ userId });
      const counselorQueryEnd = performance.now();
      timings.counselorQuery = `${(counselorQueryEnd - counselorQueryStart).toFixed(2)}ms`;

      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: 'Counselor record not found',
        });
      }

      const hasAccess = registrations.some(reg => {
        // Handle both populated (document) and unpopulated (ObjectId) counselor references
        const activeCounselorIdValue = reg.activeCounselorId || reg.primaryCounselorId;
        const activeCounselorIdString = activeCounselorIdValue?._id?.toString() || activeCounselorIdValue?.toString();
        return activeCounselorIdString === counselor._id.toString();
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active counselor for this student.',
        });
      }
    }

    // ⏱️ Calculate total times
    const serverEndTime = performance.now();
    const totalServerTime = serverEndTime - serverStartTime;
    const totalDbTime = (studentQueryEnd - studentQueryStart) + 
                        (registrationsQueryEnd - registrationsQueryStart) +
                        (timings.counselorQuery ? parseFloat(timings.counselorQuery) : 0);

    // ⏱️ Performance summary
    timings.totalDatabaseTime = `${totalDbTime.toFixed(2)}ms`;
    timings.totalServerTime = `${totalServerTime.toFixed(2)}ms`;
    timings.dataProcessingTime = `${(totalServerTime - totalDbTime).toFixed(2)}ms`;

    console.log(`📊 [${requestId}] Performance Metrics (getStudentDetails):`);
    console.log(`   └─ Student Query: ${timings.studentQuery}`);
    console.log(`   └─ Registrations Query: ${timings.registrationsQuery}`);
    if (timings.counselorQuery) {
      console.log(`   └─ Counselor Query: ${timings.counselorQuery}`);
    }
    console.log(`   └─ Total DB Time: ${timings.totalDatabaseTime}`);
    console.log(`   └─ Data Processing: ${timings.dataProcessingTime}`);
    console.log(`   └─ Total Server Time: ${timings.totalServerTime}`);

    return res.status(200).json({
      success: true,
      message: 'Student details fetched successfully',
      data: {
        student,
        registrations,
      },
      performance: timings, // Include performance metrics in response
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
 * For counselors: only allow access if they are the active counselor
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
      .populate('activeCounselorId');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // If user is counselor, verify they are the active counselor for this registration
    if (user?.role === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId });
      if (!counselor) {
        return res.status(404).json({
          success: false,
          message: 'Counselor record not found',
        });
      }

      // Handle both populated (document) and unpopulated (ObjectId) counselor references
      const activeCounselorIdValue = registration.activeCounselorId || registration.primaryCounselorId;
      const activeCounselorIdString = activeCounselorIdValue?._id?.toString() || activeCounselorIdValue?.toString();
      
      if (activeCounselorIdString !== counselor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the active counselor for this registration.',
        });
      }
    }

    // Get all form answers for this student
    const answers = await StudentFormAnswer.find({
      studentId,
    }).sort({ lastSavedAt: -1 });

    // Get student record to include mobileNumber
    const student = await Student.findById(studentId);

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
 * Update student form answers (admin/counselor can edit)
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
 * Assign primary and secondary counselors to a student service registration
 */
export const assignCounselors = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const { primaryCounselorId, secondaryCounselorId } = req.body;

    if (!primaryCounselorId && !secondaryCounselorId) {
      return res.status(400).json({
        success: false,
        message: 'At least one counselor ID is required',
      });
    }

    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // Verify primary counselor exists
    if (primaryCounselorId) {
      const primaryCounselor = await Counselor.findById(primaryCounselorId);
      if (!primaryCounselor) {
        return res.status(404).json({
          success: false,
          message: 'Primary counselor not found',
        });
      }
      registration.primaryCounselorId = primaryCounselorId;
      
      // Set as active if no active counselor or if updating primary
      if (!registration.activeCounselorId) {
        registration.activeCounselorId = primaryCounselorId;
      }
    }

    // Verify secondary counselor exists
    if (secondaryCounselorId) {
      const secondaryCounselor = await Counselor.findById(secondaryCounselorId);
      if (!secondaryCounselor) {
        return res.status(404).json({
          success: false,
          message: 'Secondary counselor not found',
        });
      }
      registration.secondaryCounselorId = secondaryCounselorId;
    }

    await registration.save();

    const updatedRegistration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name slug shortDescription icon')
      .populate('primaryCounselorId')
      .populate('secondaryCounselorId')
      .populate('activeCounselorId');

    return res.status(200).json({
      success: true,
      message: 'Counselors assigned successfully',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error: any) {
    console.error('Assign counselors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign counselors',
      error: error.message,
    });
  }
};

/**
 * Switch active counselor between primary and secondary
 */
export const switchActiveCounselor = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const { activeCounselorId } = req.body;

    if (!activeCounselorId) {
      return res.status(400).json({
        success: false,
        message: 'Active counselor ID is required',
      });
    }

    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // Verify the counselor is either primary or secondary
    const isPrimary = registration.primaryCounselorId?.toString() === activeCounselorId;
    const isSecondary = registration.secondaryCounselorId?.toString() === activeCounselorId;

    if (!isPrimary && !isSecondary) {
      return res.status(400).json({
        success: false,
        message: 'Selected counselor must be either primary or secondary counselor',
      });
    }

    registration.activeCounselorId = activeCounselorId;
    await registration.save();

    const updatedRegistration = await StudentServiceRegistration.findById(registrationId)
      .populate('serviceId', 'name slug shortDescription icon')
      .populate('primaryCounselorId')
      .populate('secondaryCounselorId')
      .populate('activeCounselorId');

    return res.status(200).json({
      success: true,
      message: 'Active counselor switched successfully',
      data: {
        registration: updatedRegistration,
      },
    });
  } catch (error: any) {
    console.error('Switch active counselor error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to switch active counselor',
      error: error.message,
    });
  }
};

