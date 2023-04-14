import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import jwt_decode from 'jwt-decode';
import dotenv from 'dotenv';

import User from '../models/user.js';

dotenv.config();

const JWTSECRET = process.env.JWTSECRET;

export const signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser.isGoogleLogin) {
      return res
        .status(404)
        .json({ message: 'Your Initial Sign In Method Was Google' });
    }

    if (!existingUser)
      return res.status(404).json({ message: "User dosen't exist" });

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordCorrect)
      return res.status(404).json({ message: 'Invalid Credentials' });

    const resData = {
      id: existingUser._id,
      email: existingUser.email,
      name: existingUser.name,
      picture: existingUser.picture,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
    };

    const token = jwt.sign({ ...resData }, JWTSECRET, { expiresIn: '7d' });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Something Went Wrong.', error });
  }
};

export const signup = async (req, res) => {
  const { email, password, confirmPassword, firstName, lastName } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser)
      return res.status(400).json({ message: 'User already exists' });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords Don't Match" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await User.create({
      email,
      password: hashedPassword,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email_verified: false,
      isGoogleLogin: false,
    });

    const resData = {
      id: result._id,
      email: result.email,
      name: result.name,
      firstName: result.firstName,
      lastName: result.lastName,
    };

    const token = jwt.sign({ ...resData }, JWTSECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Something Went Wrong.', error });
  }
};

export const googleSignIn = async (req, res) => {
  try {
    const { email, name, picture, given_name, family_name } = jwt_decode(
      req.body.token
    );

    const existingUser = await User.findOne({ email });

    let result;
    if (existingUser) {
      result = await User.findByIdAndUpdate(
        existingUser._id,
        {
          _id: existingUser._id,
          email,
          name,
          picture,
          firstName: given_name,
          lastName: family_name,
        },
        { new: true }
      );
    } else {
      created = await User.create({
        email,
        name,
        picture,
        firstName: given_name,
        lastName: family_name,
        isGoogleLogin: true,
        email_verified,
      });
    }

    const resData = {
      id: result._id,
      email: result.email,
      name: result.name,
      picture: result.picture,
      firstName: result.firstName,
      lastName: result.lastName,
    };

    const token = jwt.sign({ ...resData }, JWTSECRET, {
      expiresIn: '7d',
    });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Something Went Wrong.', error });
  }
};

// {
//   iss: 'https://accounts.google.com',
//   nbf: 1681467125,
//   aud: '312651318153-duhu95bpdjuv8vj29nndbo48gfc18lbr.apps.googleusercontent.com',
//   sub: '105568768616772199642',
//   email: 'udaygirhepunje41@gmail.com',
//   email_verified: true,
//   azp: '312651318153-duhu95bpdjuv8vj29nndbo48gfc18lbr.apps.googleusercontent.com',
//   name: 'Uday Girhepunje',
//   picture: 'https://lh3.googleusercontent.com/a/AGNmyxYgdaVnJ0NYNpwnAteVE0NwOpmjudcA1JhHX3YBAw=s96-c',
//   given_name: 'Uday',
//   family_name: 'Girhepunje',
//   iat: 1681467425,
//   exp: 1681471025,
//   jti: '3949cab7fae1c08cd54b9d67874af7e7ca9301be'
// }
