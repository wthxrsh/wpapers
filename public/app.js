// Global variables
let allWallpapers = [];
let filteredWallpapers = [];

// DOM elements
const searchInput = document.getElementById('searchInput');
const wallpapersGrid = document.getElementById('wallpapersGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const closeModal = document.getElementById('closeModal');
const cancelUpload = document.getElementById('cancelUpload');
const uploadForm = document.getElementById('uploadForm');
const wallpaperImage = document.getElementById('wallpaperImage');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const successToast = document.getElementById('successToast');
const errorToast = document.getElementById('errorToast');
const errorMessage = document.getElementById('errorMessage');

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadWallpapers();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Upload modal
    uploadBtn.addEventListener('click', openUploadModal);
    closeModal.addEventListener('click', closeUploadModal);
    cancelUpload.addEventListener('click', closeUploadModal);
    
    // Close modal when clicking outside
    uploadModal.addEventListener('click', function(e) {
        if (e.target === uploadModal) {
            closeUploadModal();
        }
    });
    
    // Image preview
    wallpaperImage.addEventListener('change', handleImagePreview);
    
    // Upload form
    uploadForm.addEventListener('submit', handleUpload);
    
    // Drag and drop functionality
    setupDragAndDrop();
}

// Load wallpapers from API
async function loadWallpapers() {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/wallpapers`);
        
        if (!response.ok) {
            throw new Error('Failed to load wallpapers');
        }
        
        allWallpapers = await response.json();
        filteredWallpapers = [...allWallpapers];
        renderWallpapers();
    } catch (error) {
        console.error('Error loading wallpapers:', error);
        showError('Failed to load wallpapers');
    } finally {
        showLoading(false);
    }
}

// Render wallpapers in the grid
function renderWallpapers() {
    if (filteredWallpapers.length === 0) {
        showEmptyState(true);
        return;
    }
    showEmptyState(false);
    wallpapersGrid.innerHTML = filteredWallpapers.map(wallpaper => `
        <div class="mb-4 break-inside-avoid rounded-lg shadow-md bg-white overflow-hidden hover:shadow-lg transition-shadow duration-200">
            <div class="relative">
                <img 
                    src="${wallpaper.image_url}" 
                    alt="${wallpaper.name}"
                    class="w-full h-auto object-cover"
                    loading="lazy"
                >
                <button 
                    onclick="downloadWallpaper('${wallpaper.image_url}', '${wallpaper.name}')"
                    class="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-md transition-opacity duration-200"
                    title="Download"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </button>
            </div>
            <div class="p-4">
                <h3 class="font-semibold text-gray-900 mb-2 truncate" title="${wallpaper.name}">
                    ${wallpaper.name}
                </h3>
                <div class="flex flex-wrap gap-1">
                    ${wallpaper.tags.map(tag => `
                        <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            ${tag.trim()}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredWallpapers = [...allWallpapers];
    } else {
        filteredWallpapers = allWallpapers.filter(wallpaper => 
            wallpaper.name.toLowerCase().includes(searchTerm) ||
            wallpaper.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }
    
    renderWallpapers();
}

// Open upload modal
function openUploadModal() {
    uploadModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close upload modal
function closeUploadModal() {
    uploadModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    uploadForm.reset();
    imagePreview.classList.add('hidden');
}

// Handle image preview
function handleImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Setup drag and drop
function setupDragAndDrop() {
    const dropZone = document.querySelector('.border-dashed');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
        dropZone.classList.add('border-primary', 'bg-blue-50');
    }
    
    function unhighlight(e) {
        dropZone.classList.remove('border-primary', 'bg-blue-50');
    }
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            wallpaperImage.files = files;
            handleImagePreview({ target: { files: files } });
        }
    }
}

// Handle upload
async function handleUpload(event) {
    event.preventDefault();
    
    const formData = new FormData(uploadForm);
    const name = formData.get('name').trim();
    const tags = formData.get('tags').trim();
    const imageFile = formData.get('image');
    
    if (!name || !tags || !imageFile) {
        showError('Please fill in all required fields');
        return;
    }
    
    // Validate file size (10MB limit)
    if (imageFile.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
    }
    
    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
        showError('Please select a valid image file');
        return;
    }
    
    try {
        const uploadFormData = new FormData();
        uploadFormData.append('name', name);
        uploadFormData.append('tags', tags);
        uploadFormData.append('image', imageFile);
        
        const response = await fetch(`${API_BASE_URL}/wallpapers`, {
            method: 'POST',
            body: uploadFormData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Upload failed');
        }
        
        const newWallpaper = await response.json();
        
        // Add to local arrays
        allWallpapers.unshift(newWallpaper);
        filteredWallpapers = [...allWallpapers];
        
        // Re-render
        renderWallpapers();
        
        // Close modal and show success
        closeUploadModal();
        showSuccess('Wallpaper uploaded successfully!');
        
    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message || 'Upload failed');
    }
}

// Download wallpaper
function downloadWallpaper(imageUrl, fileName) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Show/hide loading state
function showLoading(show) {
    if (show) {
        loadingState.classList.remove('hidden');
        wallpapersGrid.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
        wallpapersGrid.classList.remove('hidden');
    }
}

// Show/hide empty state
function showEmptyState(show) {
    if (show) {
        emptyState.classList.remove('hidden');
        wallpapersGrid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        wallpapersGrid.classList.remove('hidden');
    }
}

// Show success toast
function showSuccess(message) {
    const toast = successToast.querySelector('span');
    toast.textContent = message;
    successToast.classList.remove('translate-x-full', 'hidden');
    setTimeout(() => {
        successToast.classList.add('translate-x-full');
        setTimeout(() => successToast.classList.add('hidden'), 300); // Hide after transition
    }, 3000);
}

// Show error toast
function showError(message) {
    errorMessage.textContent = message;
    errorToast.classList.remove('translate-x-full', 'hidden');
    setTimeout(() => {
        errorToast.classList.add('translate-x-full');
        setTimeout(() => errorToast.classList.add('hidden'), 300); // Hide after transition
    }, 5000);
}

// Hide error toast by default on page load
window.addEventListener('DOMContentLoaded', () => {
    errorToast.classList.add('translate-x-full', 'hidden');
});

// Hide success toast by default on page load
window.addEventListener('DOMContentLoaded', () => {
    successToast.classList.add('translate-x-full', 'hidden');
});

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add imagesLoaded CDN
if (typeof imagesLoaded === 'undefined') {
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/imagesloaded@4/imagesloaded.pkgd.min.js';
    document.head.appendChild(script);
} 