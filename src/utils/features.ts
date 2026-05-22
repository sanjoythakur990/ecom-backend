import mongoose, { Document } from "mongoose";
import type { InvalidateCacheProps, OrderItemType } from "../types/types.js";
import { myCache } from "../app.js";
import { Product } from "../models/product.js";
import { Order } from "../models/order.js";

export const connectDB = (uri: string) => {
  mongoose
    .connect(uri, {
      dbName: "Ecommerce_26",
    })
    .then((c) => console.log(`DB connected to ${c.connection.host}`))
    .catch((err) => console.log(err));
};

export const invalidateCache = ({
  product,
  order,
  admin,
  userId,
  orderId,
  productId,
}: InvalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "categories",
      "all-products",
    ];

    if (typeof productId === "string") `product-${productId}`;
    else if (typeof productId == "object") {
      productId.forEach((i) => {
        `product-${i}`;
      });
    }

    // const products = await Product.find({}).select("_id");
    // products.forEach((i) => {
    //   const id = i._id;
    //   productKeys.push(`product-${id}`);
    // });
    myCache.del(productKeys);
  }
  if (order) {
    const orderkeys: string[] = [
      "all-orders",
      `my-orders-${userId}`,
      `order-${orderId}`,
    ];
    // const orders = await Order.find({}).select("_id");
    // orders.forEach((i) => {
    //   const id = i._id;
    //   orderkeys.push(`order-${id}`);
    // });
    myCache.del(orderkeys);
  }
  if (admin) {
    myCache.del(["admin-stats", "admin-pie-charts", "admin-bar-chart", "admin-line-chart"])
  }
};

export const reduceStock = async (orderItems: OrderItemType[]) => {
  for (let i = 0; i < orderItems.length; i++) {
    const order = orderItems[i];
    const product = await Product.findById(order?.productId);
    if (!product) throw new Error("Product Not Found!");
    product.stock -= order?.quantity as number;
    await product.save();
  }
};

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
  // console.log("thisMonth -> ", thisMonth, "lastMonth -> ", lastMonth);

  if (lastMonth === 0) return thisMonth * 100; // if lastmonth's number is 0, then we can't divide by 0, we just do(thisMonth - 0) * 100
  const percent = (thisMonth / lastMonth) * 100;
  return Number(percent.toFixed(0));
};

export const getInventories = async ({
  categories,
  productCounts,
}: {
  categories: string[];
  productCounts: number;
}) => {
  const categoriesCountPromise = categories.map((category) =>
    Product.countDocuments({ category }),
  );

  const categoriesCount = await Promise.all(categoriesCountPromise);

  const categoryCount: Record<string, number>[] = [];
  categories.forEach((category, i) => {
    categoryCount.push({
      [category]: Math.round(
        (Number(categoriesCount[i]) / productCounts) * 100,
      ),
    });
  });

  return categoryCount;
};

interface MyDocument {
  createdAt: Date;
  discount?: number;
  total?: number;
}

export const getChartData = ({
  length,
  docArr,
  property,
}: {
  length: number;
  docArr: MyDocument[];
  property?: "discount" | "total";
}) => {
  const today = new Date();
  const data: number[] = new Array(length).fill(0);
  // const orderMonthlyRevenue = new Array(6).fill(0);
  // console.log("lastSixMonthOrders", lastSixMonthOrders);

  docArr.forEach((i) => {
    const creationDate = i.createdAt;
    const monthDiff: number =
      (today.getMonth() - creationDate.getMonth() + 12) % 12;
    // console.log("monthDiff", monthDiff);

    if (monthDiff < length) {
      // orderMonthCounts[6 - monthDiff - 1] += 1;
      // orderMonthlyRevenue[6 - monthDiff - 1] += order.total;
      data[length - monthDiff - 1]! += property ? Number(i[property]) : 1;
    }
  });

  return data;
};
