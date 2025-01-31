const Cart = require('../models/cart');

// Get Cart by User ID
exports.getCartByUserId = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from auth middleware
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Add Item to Cart
exports.addToCart = async (req, res) => {
  try {
    const { product, quantity } = req.body;
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [{ product, quantity }] });
    } else {
      const itemIndex = cart.items.findIndex(item => item.product.equals(product));

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ product, quantity });
      }
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Remove Item from Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { product } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(item => !item.product.equals(product));
    await cart.save();

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
