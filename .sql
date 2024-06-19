CREATE TABLE Users (
  id SERIAL PRIMARY KEY, 
  email VARCHAR(30) UNIQUE NOT NULL, 
  password VARCHAR(50) 
);

CREATE TABLE Books (
  id SERIAL PRIMARY KEY,  -- Auto-incrementing integer for book ID
  cover_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,  -- Title of the book
  author VARCHAR(255),  -- Author of the book
  isbn VARCHAR(13) UNIQUE, -- International Standard Book Number (unique identifier)
	notes TEXT,
	brief TEXT,
	rating DECIMAL(2, 1),
  user_id INT NOT NULL,  -- Foreign key referencing the user who added the book
  FOREIGN KEY (user_id) REFERENCES Users(id)  -- Foreign key constraint
);