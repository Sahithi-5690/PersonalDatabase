-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 21, 2024 at 05:15 PM
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
  `contactInfo` varchar(255) DEFAULT NULL,
  `salaryRange` varchar(100) DEFAULT NULL,
  `experience` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `dateApplied` date DEFAULT NULL,
  `jobType` varchar(50) DEFAULT NULL,
  `resume` varchar(255) DEFAULT NULL,
  `coverLetter` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `interviewDate` date DEFAULT NULL,
  `interviewer` varchar(255) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `offerStatus` varchar(50) DEFAULT NULL,
  `acceptanceStatus` varchar(50) DEFAULT NULL,
  `startDate` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jobapplication`
--

INSERT INTO `jobapplication` (`jobApplicationId`, `jobTitle`, `jobDescription`, `contactInfo`, `salaryRange`, `experience`, `company`, `dateApplied`, `jobType`, `resume`, `coverLetter`, `status`, `interviewDate`, `interviewer`, `feedback`, `offerStatus`, `acceptanceStatus`, `startDate`) VALUES
(2, 'Data Analyst', 'Description of data analyst job', 'recruitment@company.com', '$50,000 - $70,000', '4+ years', 'ABC Ltd', '2024-05-12', 'Full-time', 'resume_link', 'cover_letter_text', 'Accepted', '0000-00-00', 'John', '', '', '', '0000-00-00'),
(3, 'Web Developer', 'Description of web developer job', 'jobs@company.com', '$70,000 - $90,000', '2+ years', '123 Corp', '2024-05-03', 'Full-time', 'resume_link', 'cover_letter_text', 'Pending', '0000-00-00', '', '', '', '', '0000-00-00'),
(4, 'Marketing Specialist', 'Description of marketing specialist job', 'careers@company.com', '$45,000 - $60,000', '1+ years', 'Marketing ABC', '2024-05-07', 'Full-time', 'resume_link', 'cover_letter_text', 'Accepted', '2024-05-15', 'Marketing Manager', 'Positive feedback', 'Offer Made', 'Accepted', NULL),
(5, 'Software Engineer', 'Description of software engineer job', 'hiring@company.com', '$80,000 - $100,000', '3+ years', 'Tech Solutions', '2024-05-10', 'Full-time', 'resume_link', 'cover_letter_text', 'Pending', NULL, NULL, NULL, NULL, NULL, NULL),
(6, 'HR Manager', 'Description of HR manager job', 'hr@company.com', '$60,000 - $80,000', '2+ years', 'HR Solutions', '2024-05-12', 'Full-time', 'resume_link', 'cover_letter_text', 'Pending', NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'Sales Representative', 'Description of sales representative job', 'sales@company.com', '$50,000 - $70,000', '2+ years', 'Sales Inc.', '2024-05-17', 'Full-time', 'resume_link', 'cover_letter_text', 'Pending', NULL, NULL, NULL, NULL, NULL, NULL);

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
  MODIFY `jobApplicationId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
