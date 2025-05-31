-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 31, 2025 at 03:11 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gc.co`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `admin_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`admin_id`, `email`, `password_hash`, `full_name`) VALUES
(1, 'admin1', '$2b$10$wzp.qr3zxIJ/UyHlai8mteZVZnX9SLu5kudsYnf9dgJ1tOLrq2hua', 'Mark Torres');

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `item_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`item_id`, `name`, `description`, `image_url`, `is_active`) VALUES
(1, 'School Uniform - Male', 'Standard male school uniform set', '/uploads/1748651376478-image-removebg-preview (3).png', 1),
(2, 'School Uniform - Female', 'Standard female school uniform set', '/uploads/1748651258429-image-removebg-preview.png', 1),
(3, 'PE Uniform', 'Physical Education uniform set', '/uploads/1748651267317-image-removebg-preview (1).png', 1),
(4, 'NSTP Uniform', 'NSTP uniform set', '', 1);

-- --------------------------------------------------------

--
-- Table structure for table `item_variants`
--

CREATE TABLE `item_variants` (
  `variant_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `size` varchar(20) DEFAULT NULL,
  `stock` int(11) DEFAULT 0,
  `price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `item_variants`
--

INSERT INTO `item_variants` (`variant_id`, `item_id`, `size`, `stock`, `price`) VALUES
(1, 1, 'XS', 51, 550.00),
(2, 1, 'S', 100, 550.00),
(3, 1, 'M', 100, 550.00),
(4, 1, 'L', 80, 550.00),
(5, 1, 'XL', 60, 550.00),
(6, 2, 'XS', 50, 530.00),
(7, 2, 'S', 100, 530.00),
(8, 2, 'M', 100, 530.00),
(9, 2, 'L', 80, 530.00),
(10, 2, 'XL', 60, 530.00),
(11, 3, 'XS', 70, 480.00),
(12, 3, 'S', 120, 480.00),
(13, 3, 'M', 120, 480.00),
(14, 3, 'L', 90, 480.00),
(15, 3, 'XL', 70, 480.00),
(16, 4, 'XS', 70, 450.00),
(17, 4, 'S', 120, 450.00),
(18, 4, 'M', 120, 450.00),
(19, 4, 'L', 80, 450.00),
(20, 4, 'XL', 70, 450.00);

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('pending','paid') DEFAULT 'pending',
  `order_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `user_id`, `status`, `order_date`) VALUES
(1, 1, 'pending', '2025-05-25 01:00:00'),
(2, 2, 'paid', '2025-05-26 06:30:00');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price_at_order` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `variant_id`, `quantity`, `price_at_order`) VALUES
(1, 1, 3, 2, 550.00),
(2, 1, 12, 1, 480.00),
(3, 2, 8, 1, 530.00),
(4, 2, 17, 2, 450.00);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `fullname` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `student_id`, `email`, `password_hash`, `fullname`) VALUES
(0, '202300000', '202300000@gordoncollege.edu.ph', '$2b$10$.ff8Muse/Kx/f5/F2r/EGetsQJjfYNvLaRnL/SmKZzevbciQRLKc6', 'Sample User'),
(1, '202300001', '202300001@gordoncollege.edu.ph', '00000', 'Alice Santos'),
(2, '202300002', '202300002@gordoncollege.edu.ph', '00000', 'Bob dela Cruz'),
(3, '202300003', '202300003@gordoncollege.edu.ph', '00000', 'Cathy Reyes');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `item_variants`
--
ALTER TABLE `item_variants`
  ADD PRIMARY KEY (`variant_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `student_id` (`student_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `item_variants`
--
ALTER TABLE `item_variants`
  MODIFY `variant_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `item_variants`
--
ALTER TABLE `item_variants`
  ADD CONSTRAINT `item_variants_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`item_id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`variant_id`) REFERENCES `item_variants` (`variant_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
