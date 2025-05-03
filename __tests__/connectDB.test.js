/* @jest-environment node */

import mongoose from 'mongoose';
import connectDB from '../utils/connectDB.js';

jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

describe('connectDB', () => {
  it('should connect to MongoDB and log success message', async () => {
    mongoose.connect.mockResolvedValueOnce({});

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
    expect(consoleLogSpy).toHaveBeenCalledWith("MongoDB is Connected...");

    consoleLogSpy.mockRestore();
  });

  it('should log error if connection fails', async () => {
    const error = new Error('Connection failed');
    mongoose.connect.mockRejectedValueOnce(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await connectDB();

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);

    consoleErrorSpy.mockRestore();
  });
});
