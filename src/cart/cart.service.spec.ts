import { CartService } from './cart.service';
import { Types } from 'mongoose';

// Simple Jest mocks for the Mongoose models used by the service
const createCartModelMock = () => {
  const cartDoc: any = {
    items: [],
    save: jest.fn().mockResolvedValue(undefined),
    populate: jest.fn().mockResolvedValue(undefined),
  };

  const CartModel: any = jest.fn().mockImplementation(data => {
    Object.assign(cartDoc, data);
    return cartDoc;
  });

  CartModel.findOne = jest.fn();

  return { CartModel, cartDoc };
};

const createProductModelMock = () => ({
  find: jest.fn(),
});

describe('CartService', () => {
  let service: CartService;
  let cartModel: any;
  let cartDoc: any;
  let productModel: any;

  beforeEach(() => {
    const cartMock = createCartModelMock();
    cartModel = cartMock.CartModel;
    cartDoc = cartMock.cartDoc;
    productModel = createProductModelMock();
    service = new CartService(cartModel, productModel);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('addToCart increases quantity when same product is added twice', async () => {
    const userId = 'user1';
    const productId = new Types.ObjectId().toString();

    const product = { _id: productId } as any;

    // First call - no existing cart
    cartModel.findOne.mockResolvedValueOnce(null);
    productModel.find.mockResolvedValueOnce([product]);

    await service.addToCart(userId, {
      items: [{ product: productId, quantity: 1 }],
    } as any);

    // Second call - existing cart returned
    cartModel.findOne.mockResolvedValueOnce(cartDoc);
    productModel.find.mockResolvedValueOnce([product]);

    const result = await service.addToCart(userId, {
      items: [{ product: productId, quantity: 1 }],
    } as any);

    expect(cartDoc.items).toHaveLength(1);
    expect(cartDoc.items[0].quantity).toBe(2);
    expect(result.items[0].quantity).toBe(2);
    expect(cartModel.findOne).toHaveBeenCalledTimes(2);
    expect(productModel.find).toHaveBeenCalledTimes(2);
    expect(cartDoc.save).toHaveBeenCalledTimes(2);
  });
});
