import jwt from "jsonwebtoken";

// Sign a JWT and set it as an httpOnly cookie
const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const days = Number(process.env.COOKIE_EXPIRES_IN) || 7;

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: days * 24 * 60 * 60 * 1000,
  });

  return token;
};

export default generateToken;
