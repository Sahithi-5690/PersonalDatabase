-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 30, 2024 at 07:19 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `personaldb`
--

-- --------------------------------------------------------

--
-- Table structure for table `jobapplication`
--

CREATE TABLE `jobapplication` (
  `jobApplicationId` int(11) NOT NULL,
  `jobTitle` varchar(255) DEFAULT NULL,
  `jobDescription` text DEFAULT NULL,
  `salaryRange` varchar(100) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `dateApplied` date DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jobapplication`
--

INSERT INTO `jobapplication` (`jobApplicationId`, `jobTitle`, `jobDescription`, `salaryRange`, `company`, `dateApplied`, `status`) VALUES
(3, 'Web Developer', 'Description of web developer job', '$70,000 - $90,000', '123 Corp', '2024-08-17', 'Pending'),
(4, 'Marketing Specialist', 'Description of marketing specialist job', '$45,000 - $60,000', 'Marketing ABC', '2024-05-07', 'Accepted'),
(5, 'Software Engineer', 'Description of software engineer job', '$80,000 - $100,000', 'Tech Solutions', '2024-05-10', 'Pending'),
(6, 'HR Manager', 'Description of HR manager job', '$60,000 - $80,000', 'HR Solutions', '2024-05-12', 'Pending'),
(8, 'Sales Representative', 'Description of sales representative job', '$50,000 - $70,000', 'Sales Inc.', '2024-05-17', 'Pending'),
(19, 'Data Analyst', 'Description', '$50,000 - $70,000', 'PB Ltd', '2024-08-08', 'Accepted'),
(20, 'Data Analyst', 'description', '$50,000 - $70,000', 'PBy Ltd', '2024-08-28', 'Accepted');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `jobapplication`
--
ALTER TABLE `jobapplication`
  ADD PRIMARY KEY (`jobApplicationId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `jobapplication`
--
ALTER TABLE `jobapplication`
  MODIFY `jobApplicationId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
