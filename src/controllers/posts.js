import express from 'express';
import mongoose from 'mongoose';
import PostMessage from '../models/postMessage.js';
import ImageKit from 'imagekit';
import dotenv from 'dotenv';
import axios from 'axios';

const router = express.Router();

dotenv.config();

const languages = ['mr', 'hi', 'gu', 'ta', 'te', 'pa', 'ml', 'kn', 'bn', 'en'];

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
  try {
    const data = JSON.stringify({
      text: JSON.stringify(text),
      dest_languages: languages.join(','),
    });

    const config = {
      method: 'get',
      url: 'https://nlp-production.up.railway.app/translate',
      headers: { 'Content-Type': 'application/json' },
      data: data,
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    return {};
  }
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
    const regexQuery = new RegExp(searchQuery, 'i');
    const query = {
      $or: [
        { 'title.english': { $regex: regexQuery } },
        { 'title.hindi': { $regex: regexQuery } },
        { 'title.marathi': { $regex: regexQuery } },
        { 'title.gujarati': { $regex: regexQuery } },
        { 'title.punjabi': { $regex: regexQuery } },
        { 'title.tamil': { $regex: regexQuery } },
        { 'title.telugu': { $regex: regexQuery } },
        { 'title.bengali': { $regex: regexQuery } },
        { 'title.kannada': { $regex: regexQuery } },
        { 'title.malayalam': { $regex: regexQuery } },
        { 'message.english': { $regex: regexQuery } },
        { 'message.hindi': { $regex: regexQuery } },
        { 'message.marathi': { $regex: regexQuery } },
        { 'message.gujarati': { $regex: regexQuery } },
        { 'message.punjabi': { $regex: regexQuery } },
        { 'message.tamil': { $regex: regexQuery } },
        { 'message.telugu': { $regex: regexQuery } },
        { 'message.bengali': { $regex: regexQuery } },
        { 'message.kannada': { $regex: regexQuery } },
        { 'message.malayalam': { $regex: regexQuery } },
        { tags: { $in: tags.split(',') } },
      ],
    };

    const posts = await PostMessage.find(query).sort({ _id: -1 });
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

    // Getting translation for title
    const titleTranslation = await getTranslations(title, languages);

    if (Object.entries(titleTranslation).length === 0)
      return res.status(500).json({ message: 'Translation Failed for title' });

    // Removing newline characters and extra spaces
    const sanitizedMessage = message
      .replace(/\n/g, '')
      .replace(/"/g, "'")
      .replace(/&nbsp;+/g, '')
      .trim();

    // Getting translation for the article in batches
    const translations1 = await getTranslations(
      sanitizedMessage.substring(0, 4000),
      languages
    );
    if (Object.entries(translations1).length === 0)
      return res
        .status(500)
        .json({ message: 'Translation Failed for translations batch 1' });

    let translations2 = {};
    let allTranslations = {};
    // Checking if the 2nd batch call is really needed?
    if (message.length >= 4000) {
      translations2 = await getTranslations(
        sanitizedMessage.substring(4001, 8000),
        languages
      );
      if (Object.entries(translations2).length === 0)
        return res
          .status(500)
          .json({ message: 'Translation Failed for translations batch 2' });

      // Concatenating the translations from 2 batches
      for (const key in translations1) {
        if (
          translations1.hasOwnProperty(key) &&
          translations2.hasOwnProperty(key)
        ) {
          allTranslations[key] = translations1[key] + translations2[key];
        }
      }
    }

    // Creating new post object to store in DB
    const newPost = new PostMessage({
      title: titleTranslation,
      name,
      tags,
      message:
        Object.entries(allTranslations).length !== 0
          ? allTranslations
          : translations1,
      creator: req.userId,
      selectedFile: uploadResponse_base64.url,
      selectedFileId: uploadResponse_base64.fileId,
      createdAt: new Date().toISOString(),
    });

    // Checking if any translation call failed and the translations object is empty
    if (Object.entries(allTranslations).length !== 0) {
      await newPost.save();
    } else if (Object.entries(translations1).length !== 0) {
      await newPost.save();
    } else {
      return res.status(500).json({ message: 'Failed to Create Post' });
    }

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: error.messsage });
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
