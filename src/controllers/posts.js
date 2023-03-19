import express from 'express';
import mongoose from 'mongoose';
import PostMessage from '../models/postMessage.js';
import ImageKit from 'imagekit';
import dotenv from 'dotenv';
import axios from 'axios';

const router = express.Router();

dotenv.config();

var imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const uploadFileBase64 = async (
  imagekitInstance,
  file_base64,
  fileName,
  tags
) => {
  const response = await imagekitInstance.upload({
    file: file_base64,
    fileName: fileName,
    folder: 'AgroFam',
    tags: tags,
  });
  return response;
};

const getTranslations = async (text, languages) => {
  let data = JSON.stringify({
    text: text,
    dest_languages: languages.join(','),
  });

  let config = {
    method: 'get',
    url: 'https://nlp-production.up.railway.app/translate',
    headers: { 'Content-Type': 'application/json' },
    data: data,
  };

  const response = await axios.request(config);
  return response.data;
};

export const getPost = async (req, res) => {
  const { id } = req.params;
  try {
    const post = await PostMessage.findById(id);

    res.status(200).json(post);
    return post;
  } catch (error) {
    res.status(404).json({ message: error.message });
    return error;
  }
};

export const getPosts = async (req, res) => {
  const { page } = req.query;
  try {
    const LIMIT = 12;
    const startIndex = (Number(page) - 1) * LIMIT;
    const total = await PostMessage.countDocuments({});

    const posts = await PostMessage.find()
      .sort({ _id: -1 })
      .limit(LIMIT)
      .skip(startIndex);

    res.status(200).json({
      data: posts,
      currentPage: Number(page),
      numberOfPages: Math.ceil(total / LIMIT),
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getPostsBySearch = async (req, res) => {
  const { searchQuery, tags } = req.query;
  try {
    const title = new RegExp(searchQuery, 'i');
    const posts = await PostMessage.find({
      $or: [{ title }, { tags: { $in: tags.split(',') } }],
    }).sort({ _id: -1 });
    res.json({ data: posts });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const createPost = async (req, res) => {
  try {
    const { title, message, selectedFile, tags, name } = req.body;

    var base64Img = selectedFile;

    const uploadResponse_base64 = await uploadFileBase64(
      imagekit,
      base64Img,
      `${title}`,
      tags
    );

    const languages = [
      'mr',
      'hi',
      'gu',
      'ta',
      'te',
      'pa',
      'ml',
      'kn',
      'bn',
      'en',
    ];

    let translations1;
    let translations2;

    // console.log(message, '\n\n')

    // Removing newline characters and extra spaces
    const sanitizedMessage = message
      .replace(/\n/g, '')
      .replace(/"/g, "'")
      .replace(/&nbsp;+/g, '')
      .trim();
    // console.log(sanitizedMessage, '\n\n')

    try {
      translations1 = await getTranslations(
        JSON.stringify(sanitizedMessage.substring(0, 4000)),
        languages
      );
    } catch (error) {
      console.log(error);
    }

    try {
      translations2 = await getTranslations(
        JSON.stringify(sanitizedMessage.substring(4001, 8000)),
        languages
      );
    } catch (error) {
      console.log(error);
    }

    let allTranslations = {};
    for (const key in translations1) {
      if (
        translations1.hasOwnProperty(key) &&
        translations2.hasOwnProperty(key)
      ) {
        allTranslations[key] = translations1[key] + translations2[key];
      }
    }

    // console.log(allTranslations.english)

    const newPost = new PostMessage({
      title,
      name,
      tags,
      message: allTranslations,
      creator: req.userId,
      selectedFile: uploadResponse_base64.url,
      selectedFileId: uploadResponse_base64.fileId,
      createdAt: new Date().toISOString(),
    });

    if (Object.entries(allTranslations).length !== 0) {
      await newPost.save();
    } else {
      throw new Error('Translation Failed');
    }

    res.status(201).json(newPost);
  } catch (error) {
    res.status(409).json({ message: error.messsage });
  }
};

export const updatePost = async (req, res) => {
  const { id: _id } = req.params;
  const post = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id))
    return res.status(404).send('No post with that id');

  const updatedPost = await PostMessage.findByIdAndUpdate(
    _id,
    { ...post, _id },
    { new: true }
  );
  res.json(updatedPost);
};

export const deletePost = async (req, res) => {
  const { id: _id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(_id))
      return res.status(404).send('No post with that id');

    await PostMessage.findByIdAndRemove(_id);

    res.json({ message: 'Post deleted Succesfully' });
  } catch (error) {
    res.json({ error });
  }
};

export const likePost = async (req, res) => {
  const { id } = req.params;

  if (!req.userId) return res.json({ message: 'Unauthenticated' });

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send('No post with that id');

  const post = await PostMessage.findById(id);

  const index = post.likes.findIndex((id) => id === String(req.userId));

  if (index === -1) {
    post.likes.push(req.userId);
  } else {
    post.likes = post.likes.filter((id) => id !== String(req.userId));
  }

  const updatedPost = await PostMessage.findByIdAndUpdate(id, post, {
    new: true,
  });

  res.status(200).json(updatedPost);
};

export const commentPost = async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;

  const post = await PostMessage.findById(id);

  post.comments.push(value);

  const updatedPost = await PostMessage.findByIdAndUpdate(id, post, {
    new: true,
  });

  res.status(200).json(updatedPost);
};

export default router;
