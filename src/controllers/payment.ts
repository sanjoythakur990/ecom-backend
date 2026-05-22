import { razorpayInstance } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.js";
import ErrorHandler from "../utils/utility-class.js";

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;

  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return next(new ErrorHandler("Please enter amount", 400));
  }

  const amountInPaise = Math.round(Number(amount) * 100);
  if (amountInPaise < 100) {
    return next(new ErrorHandler("Minimum payable amount is ₹1", 400));
  }

  const order = await razorpayInstance.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `rcpt_${Date.now().toString(36)}`,
  });

  const keyId = process.env.RAZORPAY_API_KEY;
  if (!keyId || !process.env.RAZORPAY_API_SECRET) {
    return next(new ErrorHandler("Razorpay is not configured on the server", 500));
  }

  return res.status(200).json({
    success: true,
    keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
  });
});

export const newCoupon = TryCatch(async (req, res, next) => {
  const { coupon, amount } = req.body;

  if (!coupon || !amount)
    return next(new ErrorHandler("Please enter both coupon and amount", 400));
  await Coupon.create({
    code: coupon,
    amount,
  });

  return res.status(201).json({
    success: true,
    message: `Coupon ${coupon} created successfully!`,
  });
});

export const applyDiscount = TryCatch(async (req, res, next) => {
  const { coupon } = req.query;

  const discount = await Coupon.findOne({ code: String(coupon) });

  if (!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));

  return res.status(200).json({
    success: true,
    discount: discount.amount,
  });
});

export const allCoupons = TryCatch(async (req, res, next) => {
  const coupons = await Coupon.find({});

  if (!coupons) return next(new ErrorHandler("No Coupons Found!", 400));

  return res.status(200).json({
    success: true,
    coupons,
  });
});

export const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) {
    return next(new ErrorHandler("Invalid Coupon provided", 404));
  }

  return res.status(200).json({
    success: true,
    message: `Coupon ${coupon.code} deleted successfully!`,
  });
});
