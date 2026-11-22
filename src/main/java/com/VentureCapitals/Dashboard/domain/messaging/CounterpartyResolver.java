package com.VentureCapitals.Dashboard.domain.messaging;

import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import com.VentureCapitals.Dashboard.domain.startup.StartupMemberRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Works out the organisation behind each person, for a whole list at once. */
@Component
@Transactional(readOnly = true)
public class CounterpartyResolver {
    private final VCMemberRepository vcMembers;
    private final StartupMemberRepository startupMembers;

    public CounterpartyResolver(VCMemberRepository vcMembers, StartupMemberRepository startupMembers) {
        this.vcMembers = vcMembers;
        this.startupMembers = startupMembers;
    }

    /** One query per side rather than one per person — a page of conversations is the common case. */
    public Map<UUID, Counterparty> resolve(Collection<User> users) {
        Map<UUID, User> byId = new HashMap<>();
        users.forEach(user -> byId.put(user.getId(), user));

        Map<UUID, VCMember> firms = new HashMap<>();
        vcMembers.findByUserIdIn(byId.keySet()).forEach(member -> firms.put(member.getUser().getId(), member));
        Map<UUID, StartupMember> founders = new HashMap<>();
        startupMembers.findByUserIdIn(byId.keySet()).forEach(member -> founders.put(member.getUser().getId(), member));

        Map<UUID, Counterparty> resolved = new HashMap<>();
        byId.forEach((id, user) -> {
            VCMember firm = firms.get(id);
            StartupMember startup = founders.get(id);
            if (firm != null) {
                resolved.put(id, new Counterparty(id, user.getEmail(), personName(user.getEmail(), firm.getFirm().getName()),
                        TargetType.VC_FIRM, firm.getFirm().getId(), firm.getFirm().getName(), null));
            } else if (startup != null) {
                resolved.put(id, new Counterparty(id, user.getEmail(), personName(user.getEmail(), startup.getStartup().getName()),
                        TargetType.STARTUP, startup.getStartup().getId(), startup.getStartup().getName(),
                        startup.getStartup().getLogoUrl()));
            } else {
                // Signed up but never finished setting up an organisation.
                TargetType side = user.getUserType() == UserType.STARTUP ? TargetType.STARTUP : TargetType.VC_FIRM;
                resolved.put(id, new Counterparty(id, user.getEmail(), nameFrom(user.getEmail()), side, null, null, null));
            }
        });
        return resolved;
    }

    public Counterparty resolve(User user) {
        return resolve(java.util.List.of(user)).get(user.getId());
    }

    /** Addresses that name a job or a mailbox, not a person: "Founder" tells a reader nothing. */
    private static final Set<String> ROLE_MAILBOXES = Set.of("owner", "founder", "cofounder", "co-founder", "pm", "staff",
            "admin", "info", "hello", "team", "contact", "support", "office", "mail");

    /**
     * What to call the person. Their name, as far as the address gives one; when the address is only
     * a role or a mailbox, the organisation they speak for, which is the thing a reader recognises.
     */
    static String personName(String email, String organisationName) {
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        if (organisationName != null && ROLE_MAILBOXES.contains(local.toLowerCase(Locale.ROOT))) {
            return organisationName;
        }
        return nameFrom(email);
    }

    /**
     * A readable name from an address, since people here have no name field of their own yet:
     * {@code priya.shah@lumen.health} becomes "Priya Shah". The organisation name is the better
     * label wherever there is room for it.
     */
    static String nameFrom(String email) {
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        StringBuilder out = new StringBuilder();
        for (String part : local.split("[._\\-+]+")) {
            if (part.isBlank()) continue;
            if (out.length() > 0) out.append(' ');
            out.append(part.substring(0, 1).toUpperCase(Locale.ROOT)).append(part.substring(1));
        }
        return out.length() == 0 ? email : out.toString();
    }
}
