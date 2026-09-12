import { Router } from "express";
import { listProducts } from "../data/repo";
import { asyncHandler } from "../utils/errors";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const products = listProducts(false).map((p) => ({
    productId: p.productId,
    name: p.name,
    description: p.description,
    pricePaise: p.pricePaise,
    price: p.pricePaise / 100,
    stock: p.stock,
    active: p.active,
    imageUrl: p.imageUrl,
  }));
  res.json({ data: products });
}));

export default router;