// C++ 示例
#include <iostream>
#include <vector>
#include <string>
#include <boost/asio.hpp>
#include <opencv2/opencv.hpp>
#include <Eigen/Dense>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>

// 测试选中这些标识符来检测库
// cv::Mat -> 应该识别为 opencv 或 cv
// cv::imread() -> 应该识别为 opencv
// Eigen::Matrix3d -> 应该识别为 Eigen
// nlohmann::json -> 应该识别为 nlohmann
// spdlog::info -> 应该识别为 spdlog
// boost::asio -> 应该识别为 boost

namespace asio = boost::asio;

int main() {
    // OpenCV - 选中 cv 或 Mat 或 cv::Mat
    cv::Mat image = cv::imread("test.jpg");
    cv::Mat gray;
    cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    
    // Eigen - 选中 Eigen 或 Matrix3d
    Eigen::Matrix3d matrix;
    matrix << 1, 2, 3,
              4, 5, 6,
              7, 8, 9;
    Eigen::Vector3d vec(1, 2, 3);
    auto result = matrix * vec;
    
    // nlohmann/json - 选中 json
    nlohmann::json j;
    j["name"] = "test";
    j["value"] = 42;
    
    // spdlog - 选中 spdlog 或 info
    spdlog::info("Application started");
    spdlog::error("An error occurred: {}", "details");
    
    // Boost.Asio - 选中 boost 或 asio
    asio::io_context io;
    asio::steady_timer timer(io, std::chrono::seconds(5));
    
    std::cout << "Done" << std::endl;
    return 0;
}