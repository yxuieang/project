const router = require("express").Router();
const Course = require("../models").course;
const courseValidation = require("../validation").courseValidation;

router.use((_req, _res, next) => {
  console.log("course route 正在接收一個 requset...");
  next();
});

//獲得系統中的所有課程
router.get("/", async (req, res) => {
  try {
    let courseFound = await Course.find({})
      .populate("instructor", ["username", "email"]) //populate is query object(thenable object) in mongoose
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});

//用講師 id 尋找課程
router.get("/instructor/:_instructor_id", async (req, res) => {
  let { _instructor_id } = req.params;
  try {
    let courseFound = await Course.find({ instructor: _instructor_id })
      .populate("instructor", ["username", "email"]) //populate is query object(thenable object) in mongoose
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});

//用學生 id 尋找課程
router.get("/student/:_student_id", async (req, res) => {
  let { _student_id } = req.params;
  try {
    let courseFound = await Course.find({ students: _student_id })
      .populate("instructor", ["username", "email"]) //populate is query object(thenable object) in mongoose
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});

//用課程 id 尋找課程
router.get("/:_id", async (req, res) => {
  let { _id } = req.params;
  try {
    let courseFound = await Course.findOne({ _id })
      .populate("instructor", ["email"]) //populate is query object(thenable object) in mongoose
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});

// 用課程名稱尋找課程
router.get("/findByName/:name", async (req, res) => {
  let { name } = req.params;
  try {
    let courseFound = await Course.find({ title: name })
      .populate("instructor", ["email", "username"])
      .exec();
    return res.send(courseFound);
  } catch (e) {
    return res.status(500).send(e);
  }
});

// 讓學生透過課程id來註冊新課程
router.post("/enroll/:_id", async (req, res) => {
  let { _id } = req.params;
  try {
    let course = await Course.findOne({ _id }).exec();
    course.students.push(req.user._id);
    await course.save();
    return res.send("註冊完成");
  } catch (e) {
    return res.send(e);
  }
});

//新增課程
router.post("/", async (req, res) => {
  //確認數據是否符合規範
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  if (req.user.isStudent()) {
    return res
      .status(400)
      .send("只有講師才能發布新課程。若你已是講師，請透過講師帳號登入。");
  }

  //創建新課程
  let { title, description, price } = req.body;
  try {
    let newCourse = new Course({
      title,
      description,
      price,
      instructor: req.user._id,
    });
    let savedCourse = await newCourse.save();
    return res.send("新課程已經保存");
  } catch (e) {
    return res.status(500).send("無法創建課程。。。");
  }
});

//更改課程
router.patch("/:_id", async (req, res) => {
  //確認數據是否符合規範
  let { error } = courseValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let { _id } = req.params;
  //確認課程是否存在
  try {
    let courseFound = await Course.findOne({ _id });
    if (!courseFound) {
      return res.status(400).send("找不到該課程。無法更新課程內容。");
    }

    //確認是否為該課程的講師
    if (courseFound.instructor.equals(req.user._id)) {
      let updateCourse = await Course.findByIdAndUpdate({ _id }, req.body, {
        new: true,
        runValidators: true,
      });
      return res.send({
        message: "課程已經被更新成功",
        updateCourse,
      });
    } else {
      return res.status(403).send("只有此課程的講師才能編輯課程。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

//刪除課程
//更改課程
router.delete("/:_id", async (req, res) => {
  let { _id } = req.params;
  //確認課程是否存在
  try {
    let courseFound = await Course.findOne({ _id }).exec();
    if (!courseFound) {
      return res.status(400).send("找不到該課程。無法刪除課程內容。");
    }

    //確認是否為該課程的講師
    if (courseFound.instructor.equals(req.user._id)) {
      await Course.deleteOne({ _id }).exec();
      return res.send("課程已被刪除");
    } else {
      return res.status(403).send("只有此課程的講師才能刪除課程。");
    }
  } catch (e) {
    return res.status(500).send(e);
  }
});

module.exports = router;
