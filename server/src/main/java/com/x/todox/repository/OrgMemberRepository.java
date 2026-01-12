package com.x.todox.repository;

import com.x.todox.entity.OrgMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrgMemberRepository extends JpaRepository<OrgMember, Long> {
    Optional<OrgMember> findByIdAndOrganizationId(Long id, Long orgId);
    List<OrgMember> findByOrganizationId(Long orgId);
}
