package com.shiftcart.catalog;

import com.shiftcart.catalog.CatalogDtos.CoverRequest;
import com.shiftcart.catalog.CatalogDtos.GalleryRequest;
import com.shiftcart.catalog.CatalogDtos.ItemsRequest;
import com.shiftcart.catalog.CatalogDtos.OrderRequest;
import com.shiftcart.catalog.CatalogDtos.ProductAdmin;
import com.shiftcart.catalog.CatalogDtos.ProductInput;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final AdminProductService service;

    public AdminProductController(AdminProductService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProductAdmin> list() {
        return service.list();
    }

    @GetMapping("/{id:\\d+}")
    public ProductAdmin get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<ProductAdmin> create(@RequestBody ProductInput body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(body));
    }

    @PutMapping("/order")
    public ResponseEntity<Void> reorder(@RequestBody OrderRequest body) {
        service.reorder(body == null ? null : body.ids());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id:\\d+}")
    public ProductAdmin update(@PathVariable long id, @RequestBody ProductInput body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id:\\d+}/cover")
    public ProductAdmin cover(@PathVariable long id, @RequestBody CoverRequest body) {
        return service.setCover(id, body == null ? null : body.mediaId());
    }

    @PutMapping("/{id:\\d+}/gallery")
    public ProductAdmin gallery(@PathVariable long id, @RequestBody GalleryRequest body) {
        return service.setGallery(id, body == null ? null : body.mediaIds());
    }

    @PutMapping("/{id:\\d+}/items")
    public ProductAdmin items(@PathVariable long id, @RequestBody ItemsRequest body) {
        return service.setItems(id, body == null ? null : body.items());
    }
}
