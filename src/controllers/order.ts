import { createHmac } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { razorpayInstance, myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import type { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";

export const myOrder = TryCatch(async (req, res, next) => {
  // const {id}: { id: string } = req.query;  // userid
  const id: string = req.query.id as string; // userid
  let orders;
  if (myCache.has(`my-orders-${id}`))
    orders = JSON.parse(myCache.get(`my-orders-${id}`) as string);
  else {
    orders = await Order.find({ user: id });
    myCache.set(`my-orders-${id}`, JSON.stringify(orders));
  }
  return res.status(200).json({
    success: true,
    orders,
  });
});

export const allOrders = TryCatch(async (req, res, next) => {
  const key = "all-orders";
  let orders;
  if (myCache.has(key)) orders = JSON.parse(myCache.get(key) as string);
  else {
    orders = await Order.find().populate("user", "name");
    myCache.set(key, JSON.stringify(orders));
  }
  return res.status(200).json({
    success: true,
    orders,
  });
});

export const getSingleOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const key = `order-${id}`;
  let order;
  if (myCache.has(key)) order = JSON.parse(myCache.get(key) as string);
  else {
    order = await Order.findById(id).populate("user", "name");
    if (!order) return next(new ErrorHandler("Order Not FOund", 400));
    myCache.set(key, JSON.stringify(order));
  }
  return res.status(200).json({
    success: true,
    order,
  });
});

export const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (
      !shippingInfo ||
      !orderItems ||
      !user ||
      subtotal === null ||
      subtotal === undefined ||
      tax === null ||
      tax === undefined ||
      shippingCharges === null ||
      shippingCharges === undefined ||
      discount === null ||
      discount === undefined ||
      total === null ||
      total === undefined
    )
      return next(new ErrorHandler("Please Enter All fields", 400));

    const hasRzp =
      Boolean(razorpayOrderId) &&
      Boolean(razorpayPaymentId) &&
      Boolean(razorpaySignature);
    if (
      razorpayOrderId ||
      razorpayPaymentId ||
      razorpaySignature
    ) {
      if (!hasRzp) {
        return next(
          new ErrorHandler(
            "Razorpay order id, payment id, and signature are all required after payment",
            400,
          ),
        );
      }

      const secret = process.env.RAZORPAY_API_SECRET
      if (!secret) {
        return next(new ErrorHandler("Payment verification unavailable", 500));
      }

      const expectedSig = createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSig !== razorpaySignature) {
        return next(new ErrorHandler("Payment verification failed", 400));
      }

      try {
        const payment = await razorpayInstance.payments.fetch(
          razorpayPaymentId!,
        );
        const expectedAmount = Math.round(Number(total) * 100);
        const amountOk =
          Number(payment.amount) === expectedAmount &&
          payment.order_id === razorpayOrderId &&
          String(payment.currency).toUpperCase() === "INR";
        const paidOk =
          payment.status === "captured" || payment.status === "authorized";

        if (!amountOk || !paidOk) {
          return next(
            new ErrorHandler(
              "Payment does not match this order amount or status",
              400,
            ),
          );
        }
      } catch {
        return next(new ErrorHandler("Unable to confirm Razorpay order", 400));
      }
    } else {
      return next(
        new ErrorHandler("Paid checkout via Razorpay is required", 400),
      );
    }

    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    });

    await reduceStock(orderItems);

    invalidateCache({
      product: true,
      order: true,
      admin: true,
      userId: user,
      productId: order.orderItems?.map((i) => String(i.productId)),
    });

    return res.status(201).json({
      success: true,
      message: `Order placed successfully`,
    });
  },
);

export const processOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order Not Found", 404));
  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delivered";
      break;
    default:
      order.status = "Delivered";
      break;
  }

  await order.save();

  invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: `Order Processed successfully`,
  });
});

export const deleteOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  await order.deleteOne();

  invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: `Order deleted successfully`,
  });
});
