"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    emailAddress: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        select: false
    }
});

const CourseSchema = new Schema({
    user: mongoose.Schema.Types.ObjectId,
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    estimatedTime: String,
    materialsNeeded: String
});

const Users = mongoose.model("Users", UserSchema);
const Courses = mongoose.model("Courses", CourseSchema);

module.exports.Users = Users;
module.exports.Courses = Courses;