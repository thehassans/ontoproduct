import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/modules/models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const checkAdmins = async () => {
  await connectDB();

  try {
    const admins = await User.find({ role: 'admin' }).select('email firstName lastName');
    
    if (admins.length === 0) {
      console.log('No admin users found.');
      console.log('To create one, run this script with --create <email> <password>');
    } else {
      console.log('Found Admin Users:');
      admins.forEach(admin => {
        console.log(`- ${admin.firstName} ${admin.lastName} (${admin.email})`);
      });
    }

    if (process.argv.includes('--create')) {
      const email = process.argv[3];
      const password = process.argv[4];

      if (!email || !password) {
        console.log('Usage: node check_admin.js --create <email> <password>');
        process.exit(1);
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log(`User ${email} already exists. Updating role to admin...`);
        existingUser.role = 'admin';
        existingUser.password = password; // Will be hashed by pre-save hook
        await existingUser.save();
        console.log('User updated to admin successfully.');
      } else {
        console.log(`Creating new admin user: ${email}`);
        await User.create({
          firstName: 'Admin',
          lastName: 'User',
          email,
          password,
          role: 'admin'
        });
        console.log('Admin created successfully.');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

checkAdmins();
