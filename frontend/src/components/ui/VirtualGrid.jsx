import React, { useState, useEffect, useRef, useCallback, memo } from 'react'

/**
 * VirtualGrid - High-performance virtualized grid for large product lists
 * Only renders items visible in viewport + buffer for smooth scrolling
 */
const VirtualGrid = memo(function VirtualGrid({
  items = [],
  renderItem,
  columns = 2,
  rowHeight = 300,
  gap = 6,
  overscan = 3, // Extra rows to render above/below viewport
  className = '',
  onEndReached,
  endReachedThreshold = 200,
  loading = false,
}) {
  const containerRef = useRef(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })
  const [containerWidth, setContainerWidth] = useState(0)

  // Calculate dynamic columns based on container width
  const getColumns = useCallback(() => {
    if (!containerWidth) return columns
    if (containerWidth >= 1280) return 5
    if (containerWidth >= 1024) return 4
    if (containerWidth >= 640) return 3
    return 2
  }, [containerWidth, columns])

  const actualColumns = getColumns()
  const totalRows = Math.ceil(items.length / actualColumns)
  const totalHeight = totalRows * (rowHeight + gap) - gap

  // Handle scroll and calculate visible items
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scrollTop = window.scrollY - container.offsetTop
    const viewportHeight = window.innerHeight

    const startRow = Math.max(0, Math.floor(scrollTop / (rowHeight + gap)) - overscan)
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + viewportHeight) / (rowHeight + gap)) + overscan
    )

    const start = startRow * actualColumns
    const end = Math.min(items.length, endRow * actualColumns)

    setVisibleRange({ start, end })

    // Check if near end for infinite scroll
    if (onEndReached && !loading) {
      const distanceFromEnd = totalHeight - (scrollTop + viewportHeight)
      if (distanceFromEnd < endReachedThreshold) {
        onEndReached()
      }
    }
  }, [totalRows, rowHeight, gap, overscan, actualColumns, items.length, totalHeight, onEndReached, loading, endReachedThreshold])

  // Observe container width
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Set up scroll listener
  useEffect(() => {
    handleScroll() // Initial calculation
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [handleScroll])

  // Get visible items
  const visibleItems = items.slice(visibleRange.start, visibleRange.end)
  const offsetY = Math.floor(visibleRange.start / actualColumns) * (rowHeight + gap)

  // Calculate item width
  const itemWidth = containerWidth > 0 
    ? (containerWidth - (actualColumns - 1) * gap) / actualColumns 
    : 'auto'

  return (
    <div
      ref={containerRef}
      className={`virtual-grid-container ${className}`}
      style={{
        position: 'relative',
        height: totalHeight,
        width: '100%',
      }}
    >
      <div
        className="virtual-grid-content"
        style={{
          position: 'absolute',
          top: offsetY,
          left: 0,
          right: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${actualColumns}, 1fr)`,
          gap: gap,
        }}
      >
        {visibleItems.map((item, index) => (
          <div
            key={item._id || item.id || visibleRange.start + index}
            className="virtual-grid-item"
            style={{
              width: '100%',
              height: rowHeight,
              overflow: 'hidden',
            }}
          >
            {renderItem(item, visibleRange.start + index)}
          </div>
        ))}
      </div>
    </div>
  )
})

export default VirtualGrid
