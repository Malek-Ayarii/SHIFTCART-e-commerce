package com.shiftcart.agents;

import com.shiftcart.agents.AgentDtos.AskRequest;
import com.shiftcart.agents.AgentDtos.Exchange;
import com.shiftcart.agents.AgentDtos.Roster;
import com.shiftcart.agents.AgentDtos.ThreadDetail;
import com.shiftcart.agents.AgentDtos.ThreadSummary;
import com.shiftcart.common.security.CurrentUser;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Agents IA du back-office (JWT). Les conversations sont propres à chaque membre de l'équipe. */
@RestController
@RequestMapping("/api/admin/agents")
public class AgentController {

    private final AgentService service;

    public AgentController(AgentService service) {
        this.service = service;
    }

    @GetMapping
    public Roster roster() {
        return service.roster();
    }

    @GetMapping("/threads")
    public List<ThreadSummary> threads() {
        return service.threads(CurrentUser.id());
    }

    @GetMapping("/threads/{id}")
    public ThreadDetail thread(@PathVariable long id) {
        return service.thread(id, CurrentUser.id());
    }

    @PostMapping("/threads")
    public Exchange start(@RequestBody AskRequest body) {
        return service.ask(null, body, CurrentUser.id());
    }

    @PostMapping("/threads/{id}/messages")
    public Exchange reply(@PathVariable long id, @RequestBody AskRequest body) {
        return service.ask(id, body, CurrentUser.id());
    }

    @DeleteMapping("/threads/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id, CurrentUser.id());
        return ResponseEntity.noContent().build();
    }
}
