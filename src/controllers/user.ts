import type { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { User } from "../models/user.js";
import type { NewUserRequestBody } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "../middlewares/error.js";
import { invalidateCache } from "../utils/features.js";

export const newUser = TryCatch(
  async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    // return next(new ErrorHandler())
    // throw new ErrorHandler("This is a custom error", 400)
    // throw new Error("Some Error");
    const { name, email, photo, gender, dob, _id } = req.body;

    let user = await User.findById(_id);

    if (!name || !email || !photo || !gender || !dob || !_id)
      next(new ErrorHandler("Please add all fields", 400));

    if (user)
      return res.status(200).json({
        success: true,
        message: `Welcome, ${user.name}`,
      });

    user = await User.create({
      name,
      email,
      photo,
      gender,
      dob: new Date(dob),
      _id,
    });

    // invalidateCache({user: true, admin: true})

    return res.status(201).json({
      success: true,
      message: `Welcome, ${user.name}`,
    });
    // return res.status(400).json({
    //     success: false,
    //     message: "Failed to create user:" + error
    // })
  },
);

export const getAllUser = TryCatch(
  async (
    req: Request<{}, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {

    const users = await User.find({});
    return res.status(200).json({
      success: true,
      users
    });
  }
);


export const getUser = TryCatch(
  async (
    req: Request<ParamsDictionary, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    const id = req.params.id;
    const user = await User.findById(id)

    if(!user) return next(new ErrorHandler("Invalid Id", 400))
    return res.status(200).json({
      success: true,
      user
    });
  }
);

export const deleteUser = TryCatch(
  async (
    req: Request<ParamsDictionary, {}, NewUserRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    const id = req.params.id;
    const user = await User.findById(id)

    if(!user) return next(new ErrorHandler("Invalid Id", 400))
    await user.deleteOne()

    return res.status(200).json({
      success: true,
      message: "User deleted succesfully"
    });
  }
);