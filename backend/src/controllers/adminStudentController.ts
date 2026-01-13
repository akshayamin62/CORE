import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
// import User from '../models/User';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import StudentFormAnswer from '../models/StudentFormAnswer';

/**
 * Get all students with their registrations
 */
export const getAllStudents = async (_req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const students = await Student.find()
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
 */
export const getStudentDetails = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate(
      'userId',
      'name email role isVerified isActive createdAt'
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get all registrations for this student
    const registrations = await StudentServiceRegistration.find({
      studentId: student._id,
    })
      .populate('serviceId', 'name slug shortDescription icon')
      .sort({ createdAt: -1 });

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
 */
export const getStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, registrationId } = req.params;

    const registration = await StudentServiceRegistration.findOne({
      _id: registrationId,
      studentId,
    }).populate('serviceId', 'name');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // Get all form answers for this student
    const answers = await StudentFormAnswer.find({
      studentId,
    }).sort({ lastSavedAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Form answers fetched successfully',
      data: {
        registration,
        answers,
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

