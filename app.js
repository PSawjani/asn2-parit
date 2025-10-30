/******************************************************************************
***
* ITE5315 – Assignment 2
* I declare that this assignment is my own work in accordance with Humber Academic Policy.
* No part of this assignment has been copied manually or electronically from any other source
* (including web sites) or distributed to other students.
*
* Name: Parit Sawjani Student ID: N01707730 Date: 10/27/25
*
*
******************************************************************************
**/
var express = require('express'); // Import express
var path = require('path'); // Import path to handle file inputs
var app = express(); // Creates the express instance
const fs = require('fs');
const { engine } = require('express-handlebars'); // Imports handlebars (engine)
const { query, validationResult } = require('express-validator');
const port = process.env.port || 3000; // Sets port number, either set from the .env file or use 3000

const jsonPath = path.join(__dirname, 'airbnb_data.json');
let airbnbData = [];
try {
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  airbnbData = JSON.parse(rawData);
  console.log('Data loaded successfully');
} catch (err) {
  console.error('Error reading JSON file:', err);
}

app.use(express.static(path.join(__dirname, 'public'))); // Serves static files from public folder

app.engine('.hbs', engine({ 
    extname: '.hbs', // .hbs extension used for templates
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        serviceFee: function(fee) {
            if (fee !== undefined && fee !== null && String(fee).trim() !== '') {
                return fee;
            } else {
                return '0';
            }
        },
        // Highlight row/div if fee is empty
        highlightEmptyFee: function(fee, options) {
            if (fee === undefined || fee === null || String(fee).trim() === '') {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        }
    }
})); 

app.set('view engine', '.hbs'); // The default view engine will be set to handlebars
app.set('views', path.join(__dirname, 'views')); // Views folder will be set as the template location

// Home Route
app.get('/', function (req, res) {
  res.render('index', { title: 'Express' });
});

// Users route
app.get('/users', function (req, res) {
  res.send('respond with a resource');
});

// All Data Route
app.get('/viewData', (req, res) => {
    const data = airbnbData.map(item => ({
        ...item,
        service_fee_clean: item['service fee']
    }));
    res.render('viewdata', { title: 'All Airbnb Properties', data });
});

app.get('/viewData/invoiceID/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0 || index >= airbnbData.length) {
    return res.render('error', { title: 'Error', message: 'Invalid index!' });
  }
  res.render('dataByIndex', { title: 'Data by Index', record: airbnbData[index], index });
});

app.get('/viewData/clean', (req, res) => {
    const invoices = airbnbData.map(item => ({
        ...item,
        service_fee_clean: item['service fee']
    }));
    res.render('viewCleanData', { title: 'Cleaned Data (Highlight Empty Fees)', invoices });
});

app.get('/viewData/cleanFiltered', (req, res) => {
    const invoices = airbnbData
        .filter(item => item['service fee'] !== undefined && String(item['service fee']).trim() !== '')
        .map(item => ({
            ...item,
            service_fee_clean: item['service fee']
        }));
    res.render('viewCleanData', { title: 'Cleaned Data (Filtered)', invoices });
});

app.get('/viewData/price', (req, res) => {
  res.render('priceForm', { title: 'Search by Price Range' });
});

app.get(
  '/viewData/price/result',
  [
    query('min')
        .trim()
        .notEmpty()
        .withMessage('Minimum price required')
        .isNumeric()
        .withMessage('Minimum price must be a number')
        .escape(),
        query('max')
            .trim()
            .notEmpty()
            .withMessage('Maximum price required')
            .isNumeric()
            .withMessage('Maximum price must be a number')
            .escape(),
        ],
        (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.render('error', {
            title: 'Error',
            message: errors.array()[0].msg,
        });
        }

        const minPrice = parseFloat(req.query.min);
        const maxPrice = parseFloat(req.query.max);

        const matches = airbnbData.filter(item => {
        if (!item.price) return false;
            const numericPrice = parseFloat(String(item.price).replace(/[$,]/g, '').trim());
            return !isNaN(numericPrice) && numericPrice >= minPrice && numericPrice <= maxPrice;
        });

        if (matches.length === 0) {
        return res.render('error', {
            title: 'No Results',
            message: `No properties found between $${minPrice} and $${maxPrice}`,
        });
        }

        res.render('priceResult', {
        title: `Properties from $${minPrice} to $${maxPrice}`,
        matches,
        minPrice,
        maxPrice,
        });
    }
);

// Search by ID form
app.get('/search/id', (req, res) => {
  res.render('searchIdForm', { title: 'Search by Property ID' });
});

// Search by ID result with validation
app.get('/search/id/result',
  query('id').trim().notEmpty().withMessage('ID required').escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('error', { title: 'Error', message: errors.array()[0].msg });
    }

    const propertyId = req.query.id;
    const record = airbnbData.find(item => item.id === propertyId);

    if (!record) {
            return res.render('error', { title: 'Not Found', message: `Property ID ${propertyId} not found` });
        }
        res.render('searchIdResult', { title: 'Property Details', record });
    }
);

// Search by Name form
app.get('/search/name', (req, res) => {
  res.render('searchNameForm', { title: 'Search by Property Name' });
});

// Search by Name result
app.get('/search/name/result',
    query('name').trim().notEmpty().withMessage('Name required').escape(),
    (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('error', { title: 'Error', message: errors.array()[0].msg });
    }

    const searchName = req.query.name;
    const matches = airbnbData.filter(item =>
        item["NAME"] && item["NAME"].toLowerCase().includes(searchName.toLowerCase())
    );

    if (matches.length === 0) {
        return res.render('error', { title: 'No Results', message: `No properties found matching "${searchName}"` });
    }
        res.render('searchNameResult', { title: 'Search Results', matches, searchName });
    }
);

// Wrong route
app.use((req, res) => {
  res.render('error', { title: 'Error', message: 'Wrong Route' });
});

// Listen for the port number and start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
