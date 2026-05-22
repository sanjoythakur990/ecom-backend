import multer from 'multer'
import {v4 as uuid} from 'uuid';

const storage = multer.diskStorage({
    destination(req, res, callback) {
        callback(null ,"uploads")
    },
    filename(req, file, callback) {
        const id = uuid();
        const extName = file.originalname.split(".").pop()   // macbook.png -> macbook
        const filename = `${id}.${extName}`
        callback(null, filename)
    }
})
export const singleUpload = multer({storage}).single("photo")  // we can access req.file.photo