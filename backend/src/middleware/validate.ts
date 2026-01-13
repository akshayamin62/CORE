import { Request, Response, NextFunction } from "express";
import { USER_ROLE } from "../types/roles";

// Validation helper function
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


// Signup validation middleware (OTP-based, no password)
export const validateSignup = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, email, role } = req.body;

  // Check required fields
  if (!name || !email || !role) {
    res.status(400).json({
      success: false,
      message: "All fields are required: name, email, role",
    });
    return;
  }

  // Validate name
  if (typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({
      success: false,
      message: "Name must be at least 2 characters long",
    });
    return;
  }

  // Validate email
  if (typeof email !== "string" || !validateEmail(email)) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
    return;
  }

  // Validate role
  if (!Object.values(USER_ROLE).includes(role)) {
    res.status(400).json({
      success: false,
      message: `Invalid role. Must be one of: ${Object.values(USER_ROLE).join(", ")}`,
    });
    return;
  }

  // Check if parent or counselor is trying to sign up directly
  if (role === USER_ROLE.PARENT) {
    res.status(403).json({
      success: false,
      message: "Parent cannot sign up directly",
    });
    return;
  }

  if (role === USER_ROLE.COUNSELOR) {
    res.status(403).json({
      success: false,
      message: "Counselor cannot sign up directly",
    });
    return;
  }

  // Only allow STUDENT, ALUMNI, and SERVICE_PROVIDER to sign up
  const allowedRoles = [USER_ROLE.STUDENT, USER_ROLE.ALUMNI, USER_ROLE.SERVICE_PROVIDER];
  if (!allowedRoles.includes(role)) {
    res.status(403).json({
      success: false,
      message: "This role cannot sign up directly",
    });
    return;
  }

  next();
};

// Generic validation middleware for required fields
export const validateRequest = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }
    
    next();
  };
};

