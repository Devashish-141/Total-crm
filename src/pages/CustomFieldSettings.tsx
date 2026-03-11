import { useState, useEffect } from "react";
import { dataService } from "../services/dataService";
import {
    Plus,
    Trash2,
    Settings,
    Type,
    Hash,
    Calendar,
    CheckSquare,
    Save,
    Info
} from "lucide-react";
import toast from "react-hot-toast";

interface CustomFieldDefinition {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    required: boolean;
    entity_type: 'lead' | 'customer';
}

const CustomFieldSettings = () => {
    const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadFields();
    }, []);

    const loadFields = async () => {
        setLoading(true);
        try {
            const leadsFields = await dataService.getCustomFieldDefinitions('lead');
            const customersFields = await dataService.getCustomFieldDefinitions('customer');
            setFields([...leadsFields, ...customersFields]);
        } catch (error) {
            toast.error("Failed to load custom fields.");
            console.error("Error loading custom fields:", error);
        } finally {
            setLoading(false);
        }
    };

    const addField = (entityType: 'lead' | 'customer') => {
        const newField: CustomFieldDefinition = {
            id: `temp-${Date.now()}`,
            name: '',
            label: 'New Field',
            type: 'text',
            required: false,
            entity_type: entityType
        };
        setFields([...fields, newField]);
    };

    const removeField = async (id: string) => {
        if (!id.startsWith('temp-')) {
            if (!confirm('Are you sure? This will delete the field definition for all records.')) return;
            try {
                await dataService.deleteCustomFieldDefinition(id);
                setFields(fields.filter(f => f.id !== id));
                toast.success("Field removed");
            } catch (error) {
                toast.error("Failed to delete field.");
                console.error("Error deleting custom field:", error);
            }
        } else {
            setFields(fields.filter(f => f.id !== id));
            toast.success("Field removed");
        }
    };

    const updateField = (id: string, updates: Partial<CustomFieldDefinition>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleSave = async () => {
        const invalidFields = fields.filter(f => !f.label.trim());
        if (invalidFields.length > 0) {
            toast.error("Please provide labels for all fields");
            return;
        }

        setSaving(true);
        try {
            const { error } = await dataService.saveCustomFieldDefinitions(fields);
            if (error) throw error;
            toast.success("Custom field settings saved successfully");
            await loadFields(); // Reload fields to get actual IDs for newly saved ones
        } catch (error) {
            toast.error("Failed to save settings");
            console.error("Error saving custom fields:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Settings className="text-blue-600" />
                        Custom Field Settings
                    </h1>
                    <p className="text-slate-500 mt-1">Define extra data points you want to track for Leads and Customers</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="space-y-8">
                {/* Leads Section */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Lead Custom Fields</h2>
                        <button
                            onClick={() => addField('lead')}
                            className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Plus size={16} />
                            Add Field
                        </button>
                    </div>

                    <div className="space-y-4">
                        {fields.filter(f => f.entity_type === 'lead').map((field) => (
                            <div key={field.id} className="grid grid-cols-[1fr_1fr_120px_60px_40px] gap-4 items-center p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                <input
                                    type="text"
                                    value={field.label}
                                    placeholder="Field Label (e.g. GST Number)"
                                    onChange={(e) => updateField(field.id, { label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <div className="relative">
                                    <select
                                        value={field.type}
                                        onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    >
                                        <option value="text">Text Input</option>
                                        <option value="number">Numeric Value</option>
                                        <option value="date">Date Picker</option>
                                        <option value="boolean">Checkbox/Toggle</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-2">
                                    <input
                                        type="checkbox"
                                        id={`req-${field.id}`}
                                        checked={field.required}
                                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor={`req-${field.id}`} className="text-xs font-medium text-slate-500">Required</label>
                                </div>
                                <div className="text-center text-slate-300">
                                    {field.type === 'text' && <Type size={18} />}
                                    {field.type === 'number' && <Hash size={18} />}
                                    {field.type === 'date' && <Calendar size={18} />}
                                    {field.type === 'boolean' && <CheckSquare size={18} />}
                                </div>
                                <button
                                    onClick={() => removeField(field.id)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {fields.filter(f => f.entity_type === 'lead').length === 0 && (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm italic">No custom fields defined for leads.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Customers Section */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Customer Custom Fields</h2>
                        <button
                            onClick={() => addField('customer')}
                            className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Plus size={16} />
                            Add Field
                        </button>
                    </div>

                    <div className="space-y-4">
                        {fields.filter(f => f.entity_type === 'customer').map((field) => (
                            <div key={field.id} className="grid grid-cols-[1fr_1fr_120px_60px_40px] gap-4 items-center p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                <input
                                    type="text"
                                    value={field.label}
                                    placeholder="Field Label"
                                    onChange={(e) => updateField(field.id, { label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <div className="relative">
                                    <select
                                        value={field.type}
                                        onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    >
                                        <option value="text">Text Input</option>
                                        <option value="number">Numeric Value</option>
                                        <option value="date">Date Picker</option>
                                        <option value="boolean">Checkbox/Toggle</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-2">
                                    <input
                                        type="checkbox"
                                        id={`req-${field.id}`}
                                        checked={field.required}
                                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor={`req-${field.id}`} className="text-xs font-medium text-slate-500">Required</label>
                                </div>
                                <div className="text-center text-slate-300">
                                    {field.type === 'text' && <Type size={18} />}
                                    {field.type === 'number' && <Hash size={18} />}
                                    {field.type === 'date' && <Calendar size={18} />}
                                    {field.type === 'boolean' && <CheckSquare size={18} />}
                                </div>
                                <button
                                    onClick={() => removeField(field.id)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {fields.filter(f => f.entity_type === 'customer').length === 0 && (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm italic">No custom fields defined for customers.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-800">
                    <Info className="shrink-0" size={20} />
                    <div>
                        <p className="text-sm font-bold">How it works</p>
                        <p className="text-xs mt-1">Once you add a custom field here and save, it will automatically appear in the Lead and Customer detail forms. Data is stored securely in a dedicated JSON container.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomFieldSettings;
