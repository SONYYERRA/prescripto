import validator from "validator"
import bcrypt from "bcrypt"
import { v2 as cloudinary } from "cloudinary"
import doctorModel from "../models/doctorModel.js"
import jwt from 'jsonwebtoken'
import appointmentModel from "../models/appointmentModel.js"
import userModel from "../models/userModel.js"

// api for adding doctor

const addDoctor = async (req, res) => {
    try {

        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
        const imageFile = req.file

        //Checking for all data to add Doctor

        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.json({ success: false, message: "Missing Details" })
        }

        // Validating Email format

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please Enter a Valid Email" })
        }

        // Validating Password

        if (password.length < 8) {
            return res.json({ success: false, message: "Please Enter Strong Password" })
        }

        // Encoding the password

        //First we have to generate the salt to hash The password

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        //upload image to cloudinary, so that we will get an image url ,we are going to use that image url in our database

        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
        const imageUrl = imageUpload.secure_url

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now()
        }

        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()

        res.json({ success: true, message: "Doctor Added" })

    } catch (error) {
        res.json({ success: false, message: error.message })

    }
}

// api for admin login

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            res.json({ success: true, token })
        }
        else {
            res.json({ success: false, message: "Invalid credentials" })
        }

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// API to get all doctors list for admin panel

const allDoctors = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select('-password')
        res.json({ success: true, doctors })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

//API to get all appointments List

const appointmentsAdmin = async (req,res) => {

    try {
        
        const appointments = await appointmentModel.find({})//it will provide all the appointments from all the doctors and users
        res.json({success:true,appointments})

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

//API for appointment cancellation by admin

const appointmentCancel = async (req, res) => {
    try {

        const { appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slots

        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: "Appoinment Cancelled" })


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

//API to get dashboard data in admin panel

const adminDashboard = async (req,res) => {

    try {

        const doctors = await doctorModel.find({})// all doctors data

        const users = await userModel.find({})//all users data

        const appointments = await appointmentModel.find({})// all appointments data

        const dashData = {
            doctors:doctors.length,
            appointments:appointments.length,
            patients : users.length,
            latestAppointments : appointments.reverse().slice(0,5)//reverse for getting latest appointments slice for only 5 appointments
        }

        res.json({success:true,dashData})
        
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export { addDoctor, loginAdmin, allDoctors ,appointmentsAdmin,appointmentCancel,adminDashboard }
