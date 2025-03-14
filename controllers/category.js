const Category = require('../models/category')

// get Random Integer
function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

// ================ create Category ================
exports.createCategory = async (req, res) => {
    try {
        // extract data
        const { name, description } = req.body;

        // validation
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const categoryDetails = await Category.create({
            name: name, description: description
        });

        res.status(200).json({
            success: true,
            message: 'Category created successfully'
        });
    }
    catch (error) {
        console.log('Error while creating Category');
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error while creating Category',
            error: error.message
        })
    }
}


// ================ delete Category ================
exports.deleteCategory = async (req, res) => {
    try {
        // extract data
        const { categoryId } = req.body;

        // validation
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'categoryId is required'
            });
        }

        await Category.findByIdAndDelete(categoryId);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    }
    catch (error) {
        console.log('Error while deleting Category');
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error while deleting Category',
            error: error.message
        })
    }
}


// ================ get All Category ================
exports.showAllCategories = async (req, res) => {
    try {
        // get all category from DB
        const allCategories = await Category.find({}, { name: true, description: true });

        // return response
        res.status(200).json({
            success: true,
            data: allCategories,
            message: 'All allCategories fetched successfully'
        })
    }
    catch (error) {
        console.log('Error while fetching all allCategories');
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error while fetching all allCategories'
        })
    }
}



// ================ Get Category Page Details ================
exports.getCategoryPageDetails = async (req, res) => {
    try {
        const { categoryId } = req.body;
        console.log("Request received with categoryId:", categoryId);

        // Get courses for the specified category
        console.log("Fetching category with id:", categoryId);
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: "ratingAndReviews",
            })
            .exec();

        console.log("Fetched selectedCategory:", selectedCategory);
        
        // Handle the case when the category is not found
        if (!selectedCategory) {
            console.log("Category not found.");
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // Handle the case when there are no courses
        if (selectedCategory.courses.length === 0) {
            console.log("No courses found for the selected category.");
            return res.status(404).json({
                success: false,
                data: null,
                message: "No courses found for the selected category.",
            });
        }

        console.log("Courses found for selected category:", selectedCategory.courses.length);

        // Get courses for other categories
        console.log("Fetching categories except selected category...");
        const categoriesExceptSelected = await Category.find({
            _id: { $ne: categoryId },
        });

        console.log("Categories except selected:", categoriesExceptSelected.length);
        
        let randomCategoryId = categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]._id;
        console.log("Randomly selected different category ID:", randomCategoryId);

        let differentCategory = await Category.findOne(randomCategoryId)
            .populate({
                path: "courses",
                match: { status: "Published" },
            })
            .exec();

        console.log("Fetched different category:", differentCategory);

        // Get top-selling courses across all categories
        console.log("Fetching all categories to get top-selling courses...");
        const allCategories = await Category.find()
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: {
                    path: "instructor",
                },
            })
            .exec();

        console.log("Fetched all categories. Number of categories:", allCategories.length);
        
        const allCourses = allCategories.flatMap((category) => category.courses);
        console.log("Total number of courses across all categories:", allCourses.length);

        const mostSellingCourses = allCourses
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 10);

        console.log("Top-selling courses:", mostSellingCourses.length);

        res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCategory,
                mostSellingCourses,
            },
        });
    } catch (error) {
        console.error("Error occurred:", error);  // Log the actual error
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
