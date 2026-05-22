import type { NextFunction, Request, Response } from "express";

export interface NewUserRequestBody {
  name: string;
  email: string;
  photo: string;
  gender: string;
  // role: string;
  _id: string;
  dob: Date;
}

export interface NewProductRequestBody {
  name: string;
  category: string;
  stock: number;
  price: number;
}

export type ControllerType = (
  req: Request,
  // <
  //   ParamsDictionary,
  //   {}
    // NewUserRequestBody,
    // ParsedQs,
    // Record<string, any>
  // >,
  res: Response,
  next: NextFunction,
) => Promise<Response<any, Record<string, any>> | undefined | void>;

export type SearchRequestQuery = {
  search? : string;
  price?: string;
  category?: string;
  sort?: string;
  page?: string;
}

export type InvalidateCacheProps = {
  product?: boolean;
  order?: boolean;
  admin?: boolean;
  userId?: string;
  orderId?: string;
  productId?: string | string[];
}

export type OrderItemType = {
  name: string;
  photo: string;
  price: number;
  quantity: number;
  productId: string
}

export type ShippingInfoType = {
  address: string;
  city: string;
  country: string;
  state: string;
  pinCode: number;
}

export interface NewOrderRequestBody {
  shippingInfo: ShippingInfoType;
  user: string;
  subtotal: number;
  tax: number;
  shippingCharges: number;
  discount: number;
  total: number;
  orderItems: OrderItemType[];
  /** Present when checkout used Razorpay; verified on the server before the order is created. */
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}