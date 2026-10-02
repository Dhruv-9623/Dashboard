package com.VentureCapitals.Dashboard.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.function.Function;

/**
 * The paged-list contract shared with the frontend (`PageResponse<T>` in lib/api-client.ts).
 * Deliberately not Spring's Page JSON, which is an implementation detail and changes between versions.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageResponse<T> {
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    private List<T> items;
    /** Zero-based. */
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return PageResponse.<T>builder()
                .items(page.getContent().stream().map(mapper).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    /** Clamps client-supplied paging so a request can't ask for an unbounded page. */
    public static Pageable pageable(int page, int size, Sort sort) {
        int safeSize = Math.min(Math.max(size, 1), MAX_SIZE);
        return PageRequest.of(Math.max(page, 0), safeSize, sort);
    }
}
