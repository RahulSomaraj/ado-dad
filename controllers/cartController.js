const Cart = require('../models/cart');

// Add to Cart
exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  try {
    // Validate quantity
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity. Must be greater than zero.' });
    }

    let cart = await Cart.findOne({ user: userId });

    // If no cart exists, create a new one
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Find the product in the cart
    const productIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (productIndex > -1) {
      // Update the existing item's quantity
      cart.items[productIndex].quantity += quantity;
    } else {
      // Add a new item to the cart
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    res.status(200).json({ message: 'Item added to cart successfully.', cart });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'An error occurred while adding the item to the cart.' });
  }
};

// Get Cart
exports.getCart = async (req, res) => {
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found.' });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'An error occurred while fetching the cart.' });
  }
};

// Remove from Cart
exports.removeFromCart = async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found.' });
    }

    // Filter out the item with the specified productId
    const initialItemCount = cart.items.length;
    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    // Check if an item was actually removed
    if (cart.items.length === initialItemCount) {
      return res.status(400).json({ error: 'Item not found in the cart.' });
    }

    await cart.save();
    res.status(200).json({ message: 'Item removed from cart successfully.', cart });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ error: 'An error occurred while removing the item from the cart.' });
  }
};
