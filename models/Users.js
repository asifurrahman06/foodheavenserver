const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CartItemSchema = new mongoose.Schema({
  foodName: String,
  foodPicture: String,
  foodPrice: Number,
  quantity: Number,
  foodId: String,
  sellerName: String,
  sellerAddress: String,
  sellerPhone: String,
  riderPhoneNumber: {
    type: String,
    default: "Not assigned to rider yet",
  },
  confirmedOrder: {
    type: Boolean,
    default: false,
  },
  sentToRider: {
    type: Boolean,
    default: false,
  },
  confirmedDelivery: {
    type: Boolean,
    default: false,
  },
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  address: String,
  area: String,
  phone: String,
  type: String,
  cartItems: [CartItemSchema],
  activeStatus: {
    type: Boolean,
    default: true,
  },
});

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel;
