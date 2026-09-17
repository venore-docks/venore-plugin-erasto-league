import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@venore/plugin-sdk/ui";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { computeStandings } from "../runtime/standings";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Classificação ao vivo — sempre recalculada na hora de renderizar (runtime/standings.ts), nunca
// lida do que foi salvo na composição.
export async function ErastoLeagueStandingsBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Classificação");
  const standings = await computeStandings();

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {standings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Classificação em breve — assim que os times cadastrados jogarem.</p>
      ) : (
        <div className="overflow-x-auto rounded-panel border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-center">J</TableHead>
                <TableHead className="text-center">V</TableHead>
                <TableHead className="text-center">E</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">SG</TableHead>
                <TableHead className="text-center">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((row, index) => (
                <TableRow key={row.teamId} className={index === 0 ? "bg-accent/8" : undefined}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/erasto-league/teams/${row.slug}`} className="flex items-center gap-2 hover:underline">
                      {row.crestUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.crestUrl} alt="" className="size-6 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground">
                          {row.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{row.played}</TableCell>
                  <TableCell className="text-center">{row.won}</TableCell>
                  <TableCell className="text-center">{row.drawn}</TableCell>
                  <TableCell className="text-center">{row.lost}</TableCell>
                  <TableCell className="text-center">{row.goalsFor - row.goalsAgainst}</TableCell>
                  <TableCell className="text-center font-bold">{row.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
