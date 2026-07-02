import AuthEvent from "./AuthEvent.js";
import BeautyArtist from "./BeautyArtist.js";
import Booking from "./Booking.js";
import Payment from "./Payment.js";
import PaymentMethodSetting from "./PaymentMethodSetting.js";
import Service from "./Service.js";
import SupportMessage from "./SupportMessage.js";
import User from "./User.js";

AuthEvent.belongsTo(User, { foreignKey: "userId", targetKey: "_id", as: "user" });
Booking.belongsTo(User, { foreignKey: "userId", targetKey: "_id", as: "customer" });
Booking.belongsTo(Service, { foreignKey: "serviceId", targetKey: "_id", as: "service" });

SupportMessage.belongsTo(User, { foreignKey: "userId", targetKey: "_id", as: "customer" });

User.hasMany(AuthEvent, { foreignKey: "userId" });
User.hasMany(Booking, { foreignKey: "userId" });
User.hasMany(SupportMessage, { foreignKey: "userId" });

export { AuthEvent, BeautyArtist, Booking, Payment, PaymentMethodSetting, Service, SupportMessage, User };
