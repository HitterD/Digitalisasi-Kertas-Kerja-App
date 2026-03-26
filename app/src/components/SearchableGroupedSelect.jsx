import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

/**
 * SearchableGroupedSelect
 * A grouped dropdown component with search functionality.
 * 
 * @param {Object} groupedOptions - Data in { GroupName: [ { label, original }, ... ] } format
 * @param {string} value - Currently selected value (original)
 * @param {function} onChange - Callback when a value is selected
 * @param {string} placeholder - Placeholder text
 */
const SearchableGroupedSelect = ({ groupedOptions, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter groups by search query
    const filteredGroups = Object.entries(groupedOptions).reduce((acc, [groupName, items]) => {
        const fItems = items.filter(p =>
            p.label.toLowerCase().includes(search.toLowerCase()) ||
            p.original.toLowerCase().includes(search.toLowerCase()) ||
            groupName.toLowerCase().includes(search.toLowerCase())
        );
        if (fItems.length > 0) acc[groupName] = fItems;
        return acc;
    }, {});

    const selectedLabel = value
        ? (Object.values(groupedOptions).flat().find(p => p.original === value)?.label || value)
        : '';

    return (
        <div className="searchable-select" ref={wrapperRef}>
            <div
                className={`form-select searchable-trigger ${isOpen ? 'is-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedLabel || placeholder}
                <ChevronDown size={16} />
            </div>
            {isOpen && (
                <div className="searchable-popover">
                    <div className="searchable-search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari..."
                            autoFocus
                        />
                    </div>
                    <div className="searchable-list">
                        {Object.keys(filteredGroups).length === 0 ? (
                            <div className="searchable-empty">Tidak ditemukan</div>
                        ) : (
                            Object.entries(filteredGroups).map(([groupName, items]) => (
                                <div key={groupName} className="searchable-group">
                                    <div className="searchable-group-label">{groupName}</div>
                                    {items.map(p => (
                                        <div
                                            key={p.original}
                                            className={`searchable-option ${value === p.original ? 'is-selected' : ''}`}
                                            onClick={() => { onChange(p.original); setIsOpen(false); setSearch(''); }}
                                        >
                                            {p.label}
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableGroupedSelect;
