USE iLabel;

DROP PROCEDURE IF EXISTS addCustomer;
DELIMITER ;;

CREATE PROCEDURE addCustomer(
    in_email VARCHAR(100),
    in_password VARCHAR(100),
    in_verification_token VARCHAR(64)  
)
BEGIN
    INSERT INTO customer (email, password, verification_token)
    VALUES (in_email, in_password, in_verification_token);
END
;;

DELIMITER ;


DROP PROCEDURE IF EXISTS addLabel;
DELIMITER ;;
CREATE PROCEDURE addLabel(
    in_name VARCHAR(100),
    in_customer_id VARCHAR(100)
)
BEGIN
    INSERT INTO labels (name, customer_id)
    VALUES (in_name, in_customer_id);
END
;;
DELIMITER ;
SHOW WARNINGS;


DROP PROCEDURE IF EXISTS showCustomer;
DELIMITER ;;
CREATE PROCEDURE showCustomer()
BEGIN
    SELECT * from customer;
END
;;
DELIMITER ;
SHOW WARNINGS;

DROP PROCEDURE IF EXISTS emailExists;
DELIMITER ;;
CREATE PROCEDURE emailExists(
    IN a_email VARCHAR(255)  
)
BEGIN
    
    SELECT COUNT(*) AS count FROM customer WHERE email = a_email;
END
;;
DELIMITER ;
SHOW WARNINGS;

DROP PROCEDURE IF EXISTS verifyEmail;
DELIMITER ;;

CREATE PROCEDURE verifyEmail(
    IN a_token VARCHAR(64)
)
BEGIN
    UPDATE customer 
    SET verified = TRUE
    WHERE verification_token = a_token;
END
;;

DELIMITER ;
DROP PROCEDURE IF EXISTS getAllCustomers;
DELIMITER //
CREATE PROCEDURE getAllCustomers()
BEGIN
    SELECT * FROM customer;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS getAllLabels;

-- Procedure to get all labels
DELIMITER //
CREATE PROCEDURE getAllLabels()
BEGIN
    SELECT * FROM labels;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS deleteCustomer;
DELIMITER //
CREATE PROCEDURE deleteCustomer(IN customerId INT)
BEGIN
    -- First, delete all labels associated with the customer
    DELETE FROM labels WHERE customer_id = customerId;

    -- Then, delete the customer
    DELETE FROM customer WHERE id = customerId;
END //
DELIMITER ;


DROP PROCEDURE IF EXISTS deleteLabel;
-- Procedure to delete a label
DELIMITER //
CREATE PROCEDURE deleteLabel(IN labelId INT)
BEGIN
    DELETE FROM labels WHERE id = labelId;
END //
DELIMITER ;


DROP PROCEDURE IF EXISTS updateCustomer;
DELIMITER //

CREATE PROCEDURE updateCustomer(
    IN customerId INT,
    IN newEmail VARCHAR(100),
    IN newVerified BOOLEAN,
    IN newIsAdmin BOOLEAN
)
BEGIN
    -- Update the customer only if new values are provided (using COALESCE to keep the current values if NULL)
    UPDATE customer
    SET 
        email = COALESCE(NULLIF(newEmail, ''), email),      -- If newEmail is '', keep the current email
        verified = COALESCE(newVerified, verified),         -- Keep current verified if newVerified is NULL
        is_admin = COALESCE(newIsAdmin, is_admin)           -- Keep current is_admin if newIsAdmin is NULL
    WHERE id = customerId;
END //

DELIMITER ;
