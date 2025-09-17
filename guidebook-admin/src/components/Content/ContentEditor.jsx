import React, { useState, useEffect, useRef } from 'react';
import {
  Save, FileText, Upload, Image as ImageIcon, X, Bold, Italic, Underline, List,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

const ContentEditor = ({
  activeCategory,
  onContentUpdate // callback để parent reload lại categories nếu cần
}) => {
  // Contents list và content đang active
  const [contents, setContents] = useState([]);
  const [activeContent, setActiveContent] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isNewContent, setIsNewContent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Định dạng hiện tại của selection
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    ol: false,
    ul: false,
    left: false,
    center: false,
    right: false,
    heading: ''
  });

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  // Track original content for Cancel
  const [originalHtmlContent, setOriginalHtmlContent] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');

  // --- FETCH LIST CONTENTS ---
  const fetchContents = async (categoryId = null, selectId = null) => {
    if (!categoryId && !activeCategory) return;
    const res = await apiService.contents.getByCategory(categoryId || activeCategory.id);
    setContents(res.data.data);
    // Nếu có selectId, chọn item đó, không thì lấy item đầu tiên
    if (res.data.data.length > 0) {
      let contentSelected = null;
      if (selectId) {
        contentSelected = res.data.data.find(c => `${c.id}` === `${selectId}`);
      }
      contentSelected = contentSelected || res.data.data[0];
      setActiveContent(contentSelected);
      await loadContentDetails(contentSelected.id);
    } else {
      setActiveContent(null);
      setEditorContent('');
      setContentTitle('');
      setIsEditMode(false);
    }
  };

  // Khi đổi category hoặc reload
  useEffect(() => {
    if (activeCategory) {
      fetchContents(activeCategory.id, null);
    } else {
      setContents([]);
      setActiveContent(null);
      setEditorContent('');
      setContentTitle('');
      setIsEditMode(false);
    }
  }, [activeCategory]);

  // Khi chọn content (dropdown)
  useEffect(() => {
    if (activeContent && !isNewContent) {
      loadContentDetails(activeContent.id);
      setIsEditMode(false);
    }
    // eslint-disable-next-line
  }, [activeContent, isNewContent]);

  // Khi chuyển sang Edit Mode, chỉ set innerHTML cho lần đầu vào editorRef
  useEffect(() => {
    if (isEditMode && editorRef.current) {
      editorRef.current.innerHTML = editorContent || '';
      setTimeout(() => updateFormatState(), 0);
    }
    // eslint-disable-next-line
  }, [isEditMode]);

  // --- FORMAT STATE ---
  const updateFormatState = () => {
    if (!isEditMode || !editorRef.current) return;
    try {
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        left: document.queryCommandState('justifyLeft'),
        center: document.queryCommandState('justifyCenter'),
        right: document.queryCommandState('justifyRight'),
        heading: getCurrentHeading()
      });
    } catch (e) { }
  };

  function getCurrentHeading() {
    let sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    let node = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1 && /^H[1-6]$|^P$/.test(node.nodeName)) return node.nodeName.toLowerCase();
      node = node.parentNode;
    }
    return '';
  }

  const handleSelectionChange = () => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node = sel.anchorNode;
    let found = false;
    while (node) {
      if (node === editorRef.current) found = true;
      node = node.parentNode;
    }
    if (found) updateFormatState();
  };

  useEffect(() => {
    if (isEditMode) {
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }
  });

  // --- LOAD CHI TIẾT 1 CONTENT ---
  const loadContentDetails = async (contentId) => {
    try {
      const response = await apiService.contents.getById(contentId);
      const content = response.data.data;
      setContentTitle(content.title || '');
      setEditorContent(content.html_content || '');
      setOriginalTitle(content.title || '');
      setOriginalHtmlContent(content.html_content || '');
      setLastSaved(content.updated_at ? new Date(content.updated_at) : null);
      extractImagesFromContent(content.html_content || '');
    } catch (error) {
      console.error('Failed to load content details:', error);
      toast.error('Failed to load content');
    }
  };

  const extractImagesFromContent = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const imgElements = doc.querySelectorAll('img');
    const extractedImages = Array.from(imgElements).map((img, index) => ({
      id: `img-${index}`,
      src: img.src,
      alt: img.alt || '',
      width: img.width || 'auto',
      height: img.height || 'auto'
    }));
    setImages(extractedImages);
  };

  // --- FORMAT FUNCTIONS ---
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    setEditorContent(editorRef.current.innerHTML);
    updateFormatState();
  };

  const handleHeadingChange = (e) => {
    const val = e.target.value;
    if (val) {
      formatText('formatBlock', val);
    }
  };

  const handleInput = () => {
    setEditorContent(editorRef.current.innerHTML);
    updateFormatState();
  };

  // --- IMAGE UPLOAD ---
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('content_id', activeContent?.id || 'new');
      const response = await fetch('/api/upload/image', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      const imageUrl = result.data.url;
      const newImage = {
        id: `img-${Date.now()}`,
        src: imageUrl,
        alt: file.name,
        width: 'auto',
        height: 'auto'
      };
      setImages(prev => [...prev, newImage]);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const insertImageToEditor = (image) => {
    if (!isEditMode) return;
    const imgHTML = `<img src="${image.src}" alt="${image.alt}" style="max-width: 100%; height: auto;" />`;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const imgElement = document.createElement('div');
      imgElement.innerHTML = imgHTML;
      range.insertNode(imgElement.firstChild);
      setEditorContent(editorRef.current.innerHTML);
      updateFormatState();
    }
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    toast.success('Image removed');
  };

  // --- SAVE/CREATE LOGIC ---
  const handleSave = async () => {
    if (!activeContent && !isNewContent) return;
    try {
      setSaving(true);
      const updateData = {
        title: contentTitle,
        html_content: editorContent,
        updated_at: new Date().toISOString()
      };
      let newId = null;
      if (isNewContent) {
        const createData = {
          ...updateData,
          category_id: activeCategory.id,
          slug: contentTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          is_active: true,
          order_index: contents.length + 1
        };
        const response = await apiService.contents.create(createData);
        const newContent = response.data.data;
        newId = newContent.id;
        setIsNewContent(false);
        setIsEditMode(false);
        toast.success('Content created successfully!');
      } else {
        await apiService.contents.update(activeContent.id, updateData);
        newId = activeContent.id;
        setIsEditMode(false);
        toast.success('Content saved successfully!');
      }
      // Sau khi create/update, fetch lại danh sách, và set activeContent sang content vừa tạo/sửa
      await fetchContents(activeCategory.id, newId);
      if (onContentUpdate) onContentUpdate(activeCategory.id);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  // --- CREATE NEW CONTENT ---
  const handleCreateNewContent = () => {
    setIsNewContent(true);
    setIsEditMode(true);
    setActiveContent({
      id: 'new',
      title: 'New Content',
      category_id: activeCategory?.id
    });
    setContentTitle('');
    setEditorContent('');
    setImages([]);
    setLastSaved(null);
    setOriginalHtmlContent('');
    setOriginalTitle('');
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditorContent(originalHtmlContent);
    setContentTitle(originalTitle);
  };

  // --- RENDER ---
  if (!activeCategory) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Category Selected
          </h3>
          <p className="text-gray-500">
            Please select a category from the sidebar to start editing content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Content Editor</h2>
            <select
              value={activeContent?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'new') {
                  handleCreateNewContent();
                } else {
                  const content = contents.find(c => `${c.id}` === `${e.target.value}`);
                  if (content) {
                    setActiveContent(content);
                    setIsNewContent(false);
                    setIsEditMode(false);
                  }
                }
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Content...</option>
              <option value="new">+ Create New Content</option>
              {contents.map((content) => (
                <option key={content.id} value={content.id}>
                  {content.title || 'Untitled'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {!isEditMode ? (
              <button
                onClick={() => setIsEditMode(true)}
                className="btn-secondary"
              >Edit</button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary text-sm"
                >
                  <Save size={16} className="mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >Cancel</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="p-4">
        {contents.length === 0 && (
          <div className="text-gray-400 italic">No content in this category.</div>
        )}
        {contents.length > 0 && !isEditMode && contents.map(content => (
          <div key={content.id} className="bg-white border border-gray-200 rounded-lg mb-4 p-4">
            <div className="text-lg font-bold mb-2">{content.title}</div>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.html_content }} />
            {/* Nếu muốn show ảnh riêng, extractImagesFromContent(content.html_content) để lấy danh sách ảnh */}
          </div>
        ))}
      </div>

      {/* Content Body - Chỉ render editor khi Edit */}
      {activeContent && isEditMode && (
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full">
            {/* Title */}
            <div className="border-b border-gray-200 p-4">
              <input
                type="text"
                value={contentTitle}
                onChange={(e) => setContentTitle(e.target.value)}
                placeholder="Content Title..."
                className="w-full text-2xl font-bold text-gray-900 border-none outline-none placeholder-gray-400"
                readOnly={!isEditMode}
              />
            </div>
            {/* Layout */}
            <div className="flex h-full">
              {/* Left Side */}
              <div className="flex-1 border-r border-gray-200">
                <div className="flex items-center space-x-1 p-3 border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={() => formatText('bold')}
                    className={`p-2 rounded transition-colors ${formatState.bold ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                    title="Bold"
                    type="button"
                  ><Bold size={16} /></button>
                  <button
                    onClick={() => formatText('italic')}
                    className={`p-2 rounded transition-colors ${formatState.italic ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                    title="Italic"
                    type="button"
                  ><Italic size={16} /></button>
                  <button
                    onClick={() => formatText('underline')}
                    className={`p-2 rounded transition-colors ${formatState.underline ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                    title="Underline"
                    type="button"
                  ><Underline size={16} /></button>
                  <div className="w-px h-6 bg-gray-300 mx-2"></div>
                  <button
                    onClick={() => formatText('justifyLeft')}
                    className={`p-2 rounded transition-colors ${formatState.left ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                    title="Align Left"
                    type="button"
                  ><AlignLeft size={16} /></button>
                  <button
                    onClick={() => formatText('justifyCenter')}
                    className={`p-2 rounded transition-colors ${formatState.center ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                    title="Align Center"
                    type="button"
                  ><AlignCenter size={16} /></button>
                  <button
                    onClick={() => formatText('justifyRight')}
                    className={`p-2 rounded transition-colors ${formatState.right ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                    title="Align Right"
                    type="button"
                  ><AlignRight size={16} /></button>
                  <div className="w-px h-6 bg-gray-300 mx-2"></div>
                  <button
                    onClick={() => formatText('insertUnorderedList')}
                    className={`p-2 rounded transition-colors ${formatState.ul ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                    title="Bullet List"
                    type="button"
                  ><List size={16} /></button>
                  {/* SIZE, FONT, COLOR */}
                  <select
                    onChange={e => formatText('fontSize', e.target.value)}
                    className="ml-2 px-2 py-1 text-sm border border-gray-300 rounded"
                    defaultValue=""
                    title="Font size"
                  >
                    <option value="">Size</option>
                    <option value="1">10px</option>
                    <option value="2">13px</option>
                    <option value="3">16px (default)</option>
                    <option value="4">18px</option>
                    <option value="5">24px</option>
                    <option value="6">32px</option>
                    <option value="7">48px</option>
                  </select>
                  <select
                    onChange={e => formatText('fontName', e.target.value)}
                    className="ml-2 px-2 py-1 text-sm border border-gray-300 rounded"
                    defaultValue=""
                    title="Font family"
                  >
                    <option value="">Font</option>
                    <option value="Arial">Arial</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                  <input
                    type="color"
                    onChange={e => formatText('foreColor', e.target.value)}
                    className="ml-2 w-8 h-8 p-0 border-0 bg-transparent cursor-pointer"
                    title="Text color"
                  />
                  <select
                    onChange={handleHeadingChange}
                    value={formatState.heading || ""}
                    className="ml-2 px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="">Heading</option>
                    <option value="h1">H1</option>
                    <option value="h2">H2</option>
                    <option value="h3">H3</option>
                    <option value="p">Paragraph</option>
                  </select>
                </div>
                <div className="p-4 h-full">
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning={true}
                    onInput={handleInput}
                    className="w-full h-full border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary-500 overflow-auto min-h-[400px]"
                    spellCheck={true}
                  />
                </div>
              </div>
              {/* Image Side */}
              <div className="w-80 bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <ImageIcon size={18} className="mr-2" /> Images
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full btn-primary text-sm">
                      <Upload size={16} className="mr-2" />{uploading ? 'Uploading...' : 'Upload Image'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {images.map((image) => (
                      <div key={image.id} className="bg-white rounded-lg border border-gray-200 p-3">
                        <img src={image.src} alt={image.alt} className="w-full h-24 object-cover rounded mb-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 truncate">{image.alt}</span>
                          <div className="flex space-x-1">
                            <button onClick={() => insertImageToEditor(image)} className="text-blue-600 hover:text-blue-700 text-xs px-2 py-1 rounded">Insert</button>
                            <button onClick={() => removeImage(image.id)} className="text-red-600 hover:text-red-700"><X size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {images.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <ImageIcon size={48} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No images uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS cho font-size execCommand */}
      <style>{`
        font[size="1"] { font-size: 10px !important; }
        font[size="2"] { font-size: 13px !important; }
        font[size="3"] { font-size: 16px !important; }
        font[size="4"] { font-size: 18px !important; }
        font[size="5"] { font-size: 24px !important; }
        font[size="6"] { font-size: 32px !important; }
        font[size="7"] { font-size: 48px !important; }
      `}</style>
    </div>
  );
};

export default ContentEditor;