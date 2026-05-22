import type { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import type {
  NewProductRequestBody,
  NewUserRequestBody,
  SearchRequestQuery,
} from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { faker } from "@faker-js/faker";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";

export const getLatestProducts = TryCatch(
  async (
    req: Request<{}, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    let products;
    if (myCache.has("latest-products"))
      products = JSON.parse(myCache.get("latest-products") as string);
    else {
      products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
      myCache.set("latest-products", JSON.stringify(products));
    }

    return res.status(200).json({
      success: true,
      products,
    });
  },
);

export const getAllCategories = TryCatch(
  async (
    req: Request<{}, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    let categories;
    if (myCache.has("categories"))
      categories = JSON.parse(myCache.get("categories") as string);
    else {
      categories = await Product.distinct("category");
      myCache.set("categories", JSON.stringify(categories));
    }

    return res.status(200).json({
      success: true,
      categories,
    });
  },
);

export const getAdminProducts = TryCatch(
  async (
    req: Request<{}, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    let products;
    if (myCache.has("all-products"))
      products = JSON.parse(myCache.get("all-products") as string);
    else {
      products = await Product.find({});
      myCache.set("all-products", JSON.stringify(products));
    }

    return res.status(200).json({
      success: true,
      products,
    });
  },
);

export const getSingleProduct = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    let product;
    if (myCache.has(`product-${id}`))
      product = JSON.parse(myCache.get(`product-${id}`) as string);
    else {
      product = await Product.findById(id);
      if (!product) return next(new ErrorHandler("Product Not Found", 404));
      myCache.set(`product-${id}`, JSON.stringify(product));
    }

    return res.status(200).json({
      success: true,
      product,
    });
  },
);

export const newProduct = TryCatch(
  async (
    req: Request<{}, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    const { name, price, stock, category } = req.body;
    const photo = req.file;

    if (!photo) return next(new ErrorHandler("Please add photo", 400));

    if (!name || !price || !stock || !category) {
      rm(photo.path, () => {
        console.log("Deleted");
      });
      return next(new ErrorHandler("Please enter all fields", 400));
    }

    await Product.create({
      name,
      price,
      stock,
      category: category?.toLowerCase(),
      photo: photo?.path as string,
    });

    invalidateCache({ product: true, admin: true });

    return res.status(201).json({
      success: true,
      message: `Product created successfully`,
    });
  },
);

export const updateProduct = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, price, stock, category } = req.body;
    const photo = req.file;
    const product = await Product.findById(id);
    if (!product) return next(new ErrorHandler("Invalid Product Id", 404));
    // if(!photo) return next(new ErrorHandler("Please add photo", 400))

    if (photo) {
      rm(product.photo, () => {
        console.log("Old Photo Deleted");
      });
      product.photo = photo.path;
    }

    if (name) product.name = name;
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (category) product.category = category;

    await product.save();

    invalidateCache({
      product: true,
      productId: String(product._id),
      admin: true,
    });

    return res.status(201).json({
      success: true,
      message: `Product updated successfully`,
    });
  },
);

export const deleteProduct = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new ErrorHandler("Product Not Found", 404));
    rm(product.photo!, () => {
      console.log("Product Photo deleted");
    });
    await product.deleteOne();
    invalidateCache({
      product: true,
      productId: String(product._id),
      admin: true,
    });
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  },
);

export const getAllProducts = TryCatch(
  async (
    req: Request<{}, {}, {}, SearchRequestQuery>,
    res: Response,
    next: NextFunction,
  ) => {
    const { search, sort, category, price } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = (page - 1) * limit;

    const baseQuery = {
      ...(search && { name: { $regex: search, $options: "i" } }),
      ...(price && { price: { $lte: Number(price) } }),
      ...(category && { category }),
    };

    const [products, filteredOnlyProducts] = await Promise.all([
      Product.find(baseQuery)
        .sort(sort && { price: sort === "asc" ? 1 : -1 })
        .limit(limit)
        .skip(skip),
      Product.find(baseQuery),
    ]);

    // const products = await Product.find(baseQuery).sort(
    //   sort && {price: sort === "asc" ? 1 : -1}
    // ).limit(limit).skip(skip);

    // const filteredOnlyProducts = await Product.find(baseQuery)

    const totalPage = Math.ceil(filteredOnlyProducts.length / limit);

    return res.status(200).json({
      success: true,
      products,
      totalPage,
    });
  },
);

// const generateRandomProducts = async (count: number = 10) => {
//   const products = [];

//   for (let i = 0; i < count; i++) {
//     const product = {
//       name: faker.commerce.productName(),
//       photo: "uploads\\5ba9bd91-b89c-40c2-bb8a-66703408f986.png",
//       price: Number(faker.commerce.price({ min: 1500, max: 80000, dec: 0 })),
//       stock: Number(faker.commerce.price({ min: 0, max: 100, dec: 0 })),
//       category: faker.commerce.department(),
//       createdAt: new Date(faker.date.past()),
//       updatedAt: new Date(faker.date.recent()),
//       __v: 0,
//     };

//     products.push(product);
//   }

//   await Product.create(products);

//   console.log({ succecss: true });
// };

// generateRandomProducts()

// const deleteRandomsProducts = async (count: number = 10) => {
//   const products = await Product.find({}).skip(2);

//   for (let i = 0; i < products.length; i++) {
//     const product = products[i];
//     if(product) await product.deleteOne();
//   }

//   console.log({ succecss: true });
// };

// deleteRandomsProducts(8)
