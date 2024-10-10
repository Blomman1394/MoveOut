use iLabel;


DROP TABLE IF EXISTS content;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS customer;



CREATE TABLE customer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL, 
    verification_token VARCHAR(64),
    verified BOOLEAN DEFAULT FALSE,
    logged_in BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT False
); 

CREATE TABLE labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    label_name VARCHAR(255) NOT NULL,
    background VARCHAR(255),  -- Column for storing the background information
    icons JSON NOT NULL,                -- Column for storing icons as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer(id)
);

CREATE TABLE content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    label_id INT,
    content_type ENUM('text', 'audio', 'image'),
    content_data TEXT, -- For text; for files, you might want to store the file path
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    FOREIGN KEY (label_id) REFERENCES labels(id)
);


SHOW TABLES;