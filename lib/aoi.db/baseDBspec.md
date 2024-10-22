# Base Database Structure

## Requests

### Write Request

#### General Overview

```mermaid
sequenceDiagram
 participant Client
 participant Database
 Client ->> Database: Write Request
 Database ->> Database: Validate Request
 Database ->> Database: Write Data
 Database ->> Client: Write Response
```

#### Detailed Overview

```mermaid
graph TD
 A[Client] --> B(Write Request)
 B --> C{Validate Request}
 C -->|Valid| D[Write Data]
 D --> E[Write Ahead Log]
 E --> F[SSTable File]
 F --> G[Memtable]
 G --> H[Write Response]
 G --> I[Bloom Filter]
 G --> J[Index File]
 G --> K[Compaction]
 C -->|Invalid| L[Write Response]
```

### Read Request

#### General Overview

```mermaid
sequenceDiagram
 participant Client
 participant Database
 Client ->> Database: Read Request
 Database ->> Database: Read Data
 Database ->> Client: Read Response
```

#### Detailed Overview

```mermaid
graph TD
 A[Client] --> B(Read Request)
 B --> C{Read Data}
 C -->|Found in Memtable| D[Return Data]
 C -->|Not Found in Memtable| E{Check Bloom Filter}
 E -->|Not Found in Bloom Filter| F[Return Data]
 E -->|Found in Bloom Filter| G{Check SSTable}
 G -->|Found in SSTable| H[Return Data]
 G -->|Not Found in SSTable| E{Check Next SSTable}
```

### Delete Request

#### General Overview

```mermaid
sequenceDiagram
 participant Client
 participant Database
 Client ->> Database: Delete Request
 Database ->> Database: Delete Data
 Database ->> Client: Delete Response
```

#### Detailed Overview

```mermaid
graph TD
 A[Client] --> B(Delete Request)
 B --> C{Delete Data}
 C --> D[Write Ahead Log]
 D --> E[Memtable]
 E --> F[Bloom Filter]
 E --> G[Index File]
 E --> H[Compaction]
 C --> I[Delete Response]
```

### Update Request

#### General Overview

```mermaid
sequenceDiagram
 participant Client
 participant Database
 Client ->> Database: Update Request
 Database ->> Database: Update Data
 Database ->> Client: Update Response
```

#### Detailed Overview

```mermaid
graph TD
 A[Client] --> B(Update Request)
 B --> C{Update Data}
 C --> D[Write Ahead Log]
 D --> E[Memtable]
 E --> F[Bloom Filter]
 E --> G[Index File]
 E --> H[Compaction]
 C --> I[Update Response]
```

## File Structure

### SSTable File

#### General Overview

```mermaid
graph TD
 A[SSTable File] --> B[Data Block]
 A --> C[Index Block]
 A --> D[Bloom Filter]
```

#### Detailed Overview

the file will consist of 3 blocks:

- Data Block: Contains the actual data
- Index Block: Contains the index of the data
- Bloom Filter: Contains the bloom filter of the data

Data block will be stored in the form of:

```plaintext
   Header Length (1 bytes)       
| Header                        |
| +---------------------------+ |
| | Magic Number (4 bytes)    | |
| | Version Flag (1 byte)     | |
| | Compression Flag (1 byte) | |
| | Encoding Flag (1 byte)    | |
| +---------------------------+ |
Metadata Length (1 bytes)
| Metadata                     |
| +---------------------------+ |
| | Value Data Type (1 byte) | |
| | Key Data Type (1 byte)   | |
| | KVPair Length (1 byte)   | |
| +---------------------------+ |
| | KV Pair (Amount -> KvCount) ||
```

```mermaid
graph TD
 A[Data Block] --> B[Header]
 A --> C[Metadata]
 A --> D[KV Pair]

 B --> E[Magic Number - 4 bytes]
 B --> F[Version Flag - 1 byte]
 B --> G[Compression Flag - 1 byte]
 B --> H[Encoding Flag - 1 byte]

 C --> I[Value Data Type - 1 byte]
 C --> J[Key Data Type - 1 byte]
 C --> K[KVPair Length - 1 byte]

 D --> L[KV Pair]
 L --> M[Key]
 L --> N[Value]
 L --> O[Checksum]
 L --> P[Timestamp]
 L --> Q[Deleted]
```

- and data format will be stored in the form of:
  
```plaintext
STARTDELIMITER (4 bytes ) | key length (4 bytes) | value length (4 bytes) | key (key length) | value (value length) | timestamp (8 bytes) | deleted (1 byte) | ENDDELIMITER (4 bytes) | (repeat for KVS_PER_PAGE times)
```

| Field | Length | Description |
| --- | --- | --- |
| STARTDELIMITER | 4 bytes | Start of the data block |
| key length | 4 bytes | Length of the key |
| value length | 4 bytes | Length of the value |
| checksum length | 4 bytes | Length of the checksum |
| key | key length | Key of the data |
| value | value length | Value of the data |
| checksum | 4 bytes | Checksum of the data |
| timestamp | 8 bytes | Timestamp of the data |

### Log File

#### General Overview

```mermaid
graph TD
 A[Log File] --> B[Log Block]
```

#### Detailed Overview

the file will consist of 1 block:

- Log Block: Contains the log data
- Log block will be stored in the form of:

```plaintext
   Header Length (1 bytes)
| Header                        |
| +---------------------------+ |
| | Magic Number (4 bytes)    | |
| +---------------------------+ |
| Logs                          |
| +---------------------------+ |
| | Log Data (Amount -> LogCount) ||
```

```mermaid
graph TD
 A[Log Block] --> B[Header]
 A --> C[Logs]

 B --> D[Magic Number - 4 bytes]

 C --> E[Log Data]
 E --> F[Start Delimiter - 4 bytes]
 E --> G[Logged Buffer - variable]
 E --> H[End Delimiter - 4 bytes]
```

- and data format will be stored in the form of:

```plaintext
STARTDELIMITER (4 bytes ) | logged buffer (variable) | ENDDELIMITER (4 bytes )
```

| Field | Length | Description |
| --- | --- | --- |
| STARTDELIMITER | 4 bytes | Start of the log block |
| logged buffer | variable | Logged buffer |
| ENDDELIMITER | 4 bytes | End of the log block |
