// API Configuration
const API_BASE = 'https://disease.sh/v3/covid-19';

// Global variables
let globalData = null;
let countriesData = null;

// Initialize Dashboard
async function initDashboard() {
    try {
        await loadGlobalStats();
        await loadCountriesData();
        renderWorldMap();
        renderTopCountries();
        renderBarChart();
        renderPieChart();
        updateLastUpdated();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Failed to load COVID-19 data. Please refresh the page.');
    }
}

// Load Global Statistics
async function loadGlobalStats() {
    try {
        const response = await fetch(`${API_BASE}/all`);
        globalData = await response.json();
        
        document.getElementById('total-cases').textContent = formatNumber(globalData.cases);
        document.getElementById('total-deaths').textContent = formatNumber(globalData.deaths);
        document.getElementById('total-recovered').textContent = formatNumber(globalData.recovered);
        document.getElementById('total-active').textContent = formatNumber(globalData.active);
    } catch (error) {
        console.error('Error loading global stats:', error);
        throw error;
    }
}

// Load Countries Data
async function loadCountriesData() {
    try {
        const response = await fetch(`${API_BASE}/countries`);
        countriesData = await response.json();
        countriesData.sort((a, b) => b.cases - a.cases);
    } catch (error) {
        console.error('Error loading countries data:', error);
        throw error;
    }
}

// Render World Map with D3.js
async function renderWorldMap() {
    const width = document.getElementById('world-map').offsetWidth;
    const height = 500;

    const svg = d3.select('#world-map')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const projection = d3.geoMercator()
        .scale(width / 6.5)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    // Load world map data
    const worldData = await d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');

    // Color scale
    const colorScale = d3.scaleLog()
        .domain([1, 1000, 100000, 10000000])
        .range(['#ffffcc', '#ffeda0', '#feb24c', '#f03b20']);

    // Draw countries
    svg.selectAll('path')
        .data(worldData.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', d => {
            const countryData = countriesData.find(c => 
                c.country.toLowerCase() === d.properties.name.toLowerCase()
            );
            return countryData ? colorScale(countryData.cases) : '#ccc';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
            const countryData = countriesData.find(c => 
                c.country.toLowerCase() === d.properties.name.toLowerCase()
            );
            
            const tooltip = d3.select('#tooltip');
            tooltip.classed('show', true)
                .html(`
                    <strong>${d.properties.name}</strong><br>
                    Cases: ${countryData ? formatNumber(countryData.cases) : 'No data'}<br>
                    Deaths: ${countryData ? formatNumber(countryData.deaths) : 'No data'}
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select('#tooltip').classed('show', false);
        });
}

// Render Top Countries Table
function renderTopCountries() {
    const tbody = document.getElementById('countries-tbody');
    tbody.innerHTML = '';

    const top10 = countriesData.slice(0, 10);

    top10.forEach((country, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${country.country}</strong></td>
            <td>${formatNumber(country.cases)}</td>
            <td style="color: #e74c3c;">${formatNumber(country.deaths)}</td>
            <td style="color: #2ecc71;">${formatNumber(country.recovered)}</td>
            <td style="color: #f39c12;">${formatNumber(country.active)}</td>
        `;
    });
}

// Render Bar Chart
function renderBarChart() {
    const top10 = countriesData.slice(0, 10);
    const width = document.getElementById('bar-chart').offsetWidth;
    const height = 400;
    const margin = {top: 20, right: 30, bottom: 100, left: 60};

    const svg = d3.select('#bar-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const x = d3.scaleBand()
        .domain(top10.map(d => d.country))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(top10, d => d.cases)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Draw bars
    svg.selectAll('rect')
        .data(top10)
        .enter()
        .append('rect')
        .attr('x', d => x(d.country))
        .attr('y', d => y(d.cases))
        .attr('width', x.bandwidth())
        .attr('height', d => y(0) - y(d.cases))
        .attr('fill', '#3498db')
        .attr('opacity', 0.8);

    // X axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('fill', '#fff');

    // Y axis
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => formatNumber(d)))
        .style('color', '#fff');
}

// Render Pie Chart
function renderPieChart() {
    const width = document.getElementById('pie-chart').offsetWidth;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    const svg = d3.select('#pie-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const data = [
        {label: 'Active', value: globalData.active, color: '#f39c12'},
        {label: 'Recovered', value: globalData.recovered, color: '#2ecc71'},
        {label: 'Deaths', value: globalData.deaths, color: '#e74c3c'}
    ];

    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const arcs = svg.selectAll('arc')
        .data(pie(data))
        .enter()
        .append('g');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => d.data.color)
        .attr('opacity', 0.8)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-weight', 'bold')
        .text(d => d.data.label);
}

// Utility Functions
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('last-updated').textContent = now.toLocaleString();
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initDashboard);
