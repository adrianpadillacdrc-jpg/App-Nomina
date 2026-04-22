package com.nomina.numa.service;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NovedadDirectService {

    private final MongoTemplate mongoTemplate;

    public List<Document> findAllAsDocuments() {
        log.info("=== NovedadDirectService.findAllAsDocuments ===");
        try {
            MongoDatabase db = mongoTemplate.getDb();
            log.info("Database: {}", db.getName());

            MongoCollection<Document> collection = db.getCollection("novedades");
            log.info("Collection: {}", collection.getNamespace().getCollectionName());

            long count = collection.countDocuments();
            log.info("Total documentos en novedades: {}", count);

            List<Document> docs = collection.find().into(new ArrayList<>());
            log.info("Documentos recuperados: {}", docs.size());

            if (!docs.isEmpty()) {
                log.info("Primer documento: {}", docs.get(0).toJson());
            }

            return docs;
        } catch (Exception e) {
            log.error("Error al obtener documentos: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public long count() {
        try {
            MongoDatabase db = mongoTemplate.getDb();
            MongoCollection<Document> collection = db.getCollection("novedades");
            long count = collection.countDocuments();
            log.info("Count novedades: {}", count);
            return count;
        } catch (Exception e) {
            log.error("Error al contar: {}", e.getMessage());
            return 0;
        }
    }
}