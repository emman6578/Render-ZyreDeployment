import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

export const successHandler = (
  data: any,
  res: Response,
  method: string,
  message: string
) => {
  const successResponse = {
    success: true,
    method: method,
    message: message,
    data: data,
  };
  res.status(200).json(successResponse);
};
