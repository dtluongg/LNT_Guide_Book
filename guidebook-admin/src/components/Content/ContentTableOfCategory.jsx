import React, { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, Edit2, Trash2, Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiService } from "../../services/apiService";

// Giao diện: Truyền vào props là categoryId, gọi API lấy danh sách content của category này
const ContentListForCategory = ({ categoryId, onEditContent, refreshSignal }) => {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch lại khi đổi category hoặc thao tác cập nhật
  useEffect(() => {
    if (categoryId) fetchContents();
    // eslint-disable-next-line
  }, [categoryId, refreshSignal]);

  const fetchContents = async () => {
    setLoading(true);
    try {
      const res = await apiService.contents.getByCategory(categoryId);
      setContents(res.data.data || []);
    } catch (e) {
      toast.error("Failed to load contents");
      setContents([]);
    }
    setLoading(false);
  };

  // Đổi thứ tự (up/down)
  const moveContent = async (contentId, direction) => {
    // Find current and neighbor
    const idx = contents.findIndex(c => c.id === contentId);
    if (idx === -1) return;
    let swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= contents.length) return;

    const current = contents[idx];
    const neighbor = contents[swapIdx];

    // Hoán đổi order_index 2 item
    try {
      await apiService.contents.update(current.id, { order_index: neighbor.order_index });
      await apiService.contents.update(neighbor.id, { order_index: current.order_index });
      fetchContents();
    } catch (e) {
      toast.error("Failed to reorder contents");
    }
  };

  // Xoá content
  const deleteContent = async (id) => {
    if (!window.confirm("Do you really want to delete this content?")) return;
    try {
      await apiService.contents.delete(id);
      toast.success("Content deleted");
      fetchContents();
    } catch (e) {
      toast.error("Failed to delete content");
    }
  };

  // Toggle trạng thái ẩn/hiện
  const togglePublish = async (item) => {
    try {
      await apiService.contents.update(item.id, { is_published: !item.is_published });
      toast.success("Status updated");
      fetchContents();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  // Thêm mới content
  const createNewContent = () => {
    if (onEditContent) onEditContent(null); // null = tạo mới
  };

  // Edit content
  const handleEdit = (item) => {
    if (onEditContent) onEditContent(item);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">
          Content List {loading && <span className="text-xs text-gray-500">Loading...</span>}
        </h3>
        <button onClick={createNewContent}
                className="btn-primary px-3 py-1 flex items-center gap-2">
          <Plus size={16} /> New Content
        </button>
      </div>
      <table className="min-w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-2 text-left">#</th>
            <th className="py-2 px-2 text-left">Title</th>
            <th className="py-2 px-2 text-center">Order</th>
            <th className="py-2 px-2 text-center">Status</th>
            <th className="py-2 px-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contents.map((item, idx) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="py-2 px-2">{idx + 1}</td>
              <td className="py-2 px-2">{item.title}</td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => moveContent(item.id, "up")}
                  disabled={idx === 0}
                  className={`mr-1 p-1 rounded ${idx === 0 ? "opacity-40" : "hover:bg-gray-200"}`}
                  title="Move Up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveContent(item.id, "down")}
                  disabled={idx === contents.length - 1}
                  className={`p-1 rounded ${idx === contents.length - 1 ? "opacity-40" : "hover:bg-gray-200"}`}
                  title="Move Down"
                >
                  <ArrowDown size={16} />
                </button>
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => togglePublish(item)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                  title={item.is_published ? "Click to hide" : "Click to show"}
                  style={{
                    background: item.is_published ? "#dbf5e0" : "#f3f4f6",
                    color: item.is_published ? "#15803d" : "#6b7280"
                  }}
                >
                  {item.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                  {item.is_published ? "Visible" : "Hidden"}
                </button>
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  onClick={() => handleEdit(item)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Edit"
                >
                  <Edit2 size={17} />
                </button>
                <button
                  onClick={() => deleteContent(item.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete"
                >
                  <Trash2 size={17} />
                </button>
              </td>
            </tr>
          ))}
          {contents.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-10 text-gray-400">No content in this category.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ContentListForCategory;